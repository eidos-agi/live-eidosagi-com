#!/usr/bin/env python3
"""Live cross-GPU racer for live.eidosagi.com.

Every TICK seconds:
  1. run_start with all 3 GPUs as lanes.
  2. In parallel, ssh into each GPU and run ollama /api/generate.
  3. log_progress for each GPU's measured tok/s.
  4. run_end + milestone event.

Uses asyncio.create_subprocess_exec (no shell) for the ssh call;
the remote command is passed as a fixed argv, the payload via stdin
so no shell-escape is needed.

Env:
  INGEST_URL           default https://live.eidosagi.com
  INGEST_TOKEN         required
  RACER_TICK_SECONDS   default 90
  RACER_MODELS         default 'qwen3.6:35b-a3b,qwen3.6:7b,llama3.3:70b,gemma3:27b,deepseek-v3,qwen2.5:72b'
  RACER_NUM_PREDICT    default 120
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

INGEST_URL = os.environ.get("INGEST_URL", "https://live.eidosagi.com").rstrip("/")
INGEST_TOKEN = os.environ.get("INGEST_TOKEN", "")
TICK_SECONDS = int(os.environ.get("RACER_TICK_SECONDS", "90"))
MODELS = [
    m.strip()
    for m in os.environ.get(
        "RACER_MODELS",
        # 2026-04-17 rotation — newest-first.
        # The vision's "local AI is already here, already current" claim
        # doesn't hold if we're racing weights from mid-2024. Per the
        # feedback_newer_model_prior rule: same-family newer version +
        # published benchmarks agree → just upgrade. No measurement task
        # required for same-family bumps.
        #
        # Dropped (mid-2024, superseded): llama3.2:1b, qwen2.5:1.5b, llama3.1:8b.
        # Kept for dense-vs-MoE comparison story: qwen2.5:72b.
        # Added (need pull on at least one GPU to start racing): qwen3.6:7b,
        # gemma3:27b, deepseek-v3. has_model() skips any tag that isn't
        # pulled on a given GPU, so un-pulled tags are no-ops not errors.
        ",".join([
            "qwen3.6:35b-a3b",   # Apr 2026, sparse MoE, 23 GB — harness default
            "qwen3.6:7b",        # dense companion — needs pull
            "llama3.3:70b",      # late 2024, already on A6000
            "gemma3:27b",        # Google current — needs pull
            "deepseek-v3",       # needs pull
            "qwen2.5:72b",       # kept as dense baseline vs qwen3.6 MoE
        ]),
    ).split(",")
    if m.strip()
]
NUM_PREDICT = int(os.environ.get("RACER_NUM_PREDICT", "120"))
PROMPT = "Count slowly from 1 to 30, one number per line."
KEY_DIR = Path.home() / ".thunder" / "keys"

# (label, ssh_port, ssh_key, ip, gpu_type, vram_gb, cost_hr)
GPUS = [
    ("A6000", "30117", "jlaa7b09", "69.19.136.6",   "A6000", 48, 0.35),
    ("A100",  "32079", "uwpfv1j3", "185.216.21.95", "A100",  80, 0.78),
    ("H100",  "32448", "vx7agf6f", "62.169.159.125","H100",  80, 2.49),
]


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def ingest(kind: str, payload: dict) -> dict:
    data = json.dumps({"kind": kind, "payload": payload}).encode()
    req = urllib.request.Request(
        f"{INGEST_URL}/api/ingest", data=data, method="POST",
    )
    req.add_header("content-type", "application/json")
    req.add_header("x-ingest-token", INGEST_TOKEN)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return {"ok": False, "status": e.code}
    except Exception as e:  # noqa: BLE001
        return {"ok": False, "error": str(e)}


async def has_model(row: tuple, model: str) -> bool:
    """Check whether a GPU has a given model loaded locally (quick ollama list)."""
    label, port, keyfile, ip, *_ = row
    key = KEY_DIR / keyfile
    cmd = [
        "ssh",
        "-o", "BatchMode=yes",
        "-o", "StrictHostKeyChecking=no",
        "-o", "ConnectTimeout=5",
        "-p", port,
        "-i", str(key),
        f"ubuntu@{ip}",
        f"ollama list 2>/dev/null | awk '{{print $1}}' | grep -Fx '{model}' >/dev/null && echo yes || echo no",
    ]
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        out, _ = await asyncio.wait_for(proc.communicate(), timeout=10)
        return out.decode().strip() == "yes"
    except Exception:  # noqa: BLE001
        return False


async def race_one_gpu(row: tuple, model: str) -> dict:
    label, port, keyfile, ip, gpu_type, vram_gb, cost_hr = row
    gpu_id = f"thunder-{label.lower()}"
    key = KEY_DIR / keyfile

    # SSH into the Thunder box and run ollama via curl with a properly
    # escaped JSON payload. Keeping it one-line avoids ssh arg-joining
    # headaches with embedded newlines.
    payload = json.dumps({
        "model": model,
        "prompt": PROMPT,
        "stream": False,
        "options": {"num_predict": NUM_PREDICT},
    })
    # Pipe the payload via stdin to curl so we never have to quote
    # it through sshd's argv shell. The whole remote command runs as a
    # single shell string, but the payload is NOT part of the argv.
    remote_shell = (
        "curl -s -X POST http://localhost:11434/api/generate "
        "-H 'content-type: application/json' "
        "--data-binary @-"
    )
    cmd = [
        "ssh",
        "-o", "BatchMode=yes",
        "-o", "StrictHostKeyChecking=no",
        "-o", "ConnectTimeout=8",
        "-p", port,
        "-i", str(key),
        f"ubuntu@{ip}",
        remote_shell,
    ]

    t0 = time.time()
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        out, err = await asyncio.wait_for(
            proc.communicate(input=payload.encode()), timeout=120,
        )
    except asyncio.TimeoutError:
        return {"gpu": label, "gpu_id": gpu_id, "ok": False, "error": "timeout"}
    except Exception as e:  # noqa: BLE001
        return {"gpu": label, "gpu_id": gpu_id, "ok": False, "error": str(e)}

    if proc.returncode != 0:
        log(f"  {label}: rc={proc.returncode}  stderr={err.decode()[:100]}")
        return {"gpu": label, "gpu_id": gpu_id, "ok": False,
                "error": f"rc={proc.returncode}"}

    try:
        data = json.loads(out.decode())
    except Exception:  # noqa: BLE001
        return {"gpu": label, "gpu_id": gpu_id, "ok": False, "error": "parse"}

    eval_count = data.get("eval_count", 0) or 0
    eval_ns = data.get("eval_duration", 0) or 0
    tok_s = (eval_count / (eval_ns / 1e9)) if eval_ns > 0 else 0.0
    load_ns = data.get("load_duration", 0) or 0
    latency_ms = ((load_ns + eval_ns) / 1e6) if (load_ns or eval_ns) else (time.time() - t0) * 1000
    return {
        "gpu": label,
        "gpu_id": gpu_id,
        "ok": True,
        "tok_s": tok_s,
        "tokens": eval_count,
        "latency_ms": latency_ms,
    }


async def one_race() -> None:
    model = MODELS[int(time.time() // TICK_SECONDS) % len(MODELS)]
    run_id = f"race-{int(time.time())}"
    started_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    log(f"race: model={model} run_id={run_id}")

    # Only include GPUs that have this model loaded — avoids stuck pulls.
    availability = await asyncio.gather(
        *[has_model(r, model) for r in GPUS]
    )
    active = [r for r, ok in zip(GPUS, availability) if ok]
    if not active:
        log(f"  skipped: no GPU has {model} loaded")
        return
    log(f"  active lanes: {', '.join(r[0] for r in active)}")

    ingest("run_start", {
        "runId": run_id,
        "sessionId": "live-racer",
        "promptLabel": f"cross-GPU race · {model}",
        "gpus": [
            {
                "name": f"thunder-{r[0].lower()}",
                "type": r[4],
                "vramGB": r[5],
                "costPerHour": r[6],
            }
            for r in active
        ],
        "models": [model],
        "startedAt": started_at,
        "note": "live-racer · one prompt, lanes that have this model, in parallel",
    })

    results = await asyncio.gather(
        *[race_one_gpu(r, model) for r in active]
    )

    for r in results:
        if not r.get("ok"):
            log(f"  {r['gpu']}: skipped — {r.get('error')}")
            continue
        ingest("progress", {
            "runId": run_id,
            "gpuId": r["gpu_id"],
            "model": model,
            "useCase": "live-race",
            "tokPerSec": round(r["tok_s"], 1),
            "latencyMs": round(r["latency_ms"], 1),
        })
        log(f"  {r['gpu']}: {r['tok_s']:6.1f} tok/s")

    ok = [r for r in results if r.get("ok")]
    if ok:
        sorted_ok = sorted(ok, key=lambda x: -x["tok_s"])
        winner = sorted_ok[0]
        summary = (
            f"race · {model} · {winner['gpu']} {winner['tok_s']:.0f} tok/s ["
            + ", ".join(f"{r['gpu']} {r['tok_s']:.0f}" for r in sorted_ok[1:])
            + "]"
        )
    else:
        summary = f"race aborted — all lanes failed on {model}"

    ingest("run_end", {
        "runId": run_id,
        "status": "completed" if ok else "failed",
        "note": summary,
    })
    ingest("event", {
        "sessionId": "live-racer",
        "actor": "benchmark",
        "kind": "milestone",
        "summary": summary,
        "icon": "flame",
        "relatedRun": run_id,
        "details": {"model": model, "ok_lanes": len(ok),
                    "winner": ok[0]["gpu"] if ok else None},
    })


async def main() -> None:
    if not INGEST_TOKEN:
        log("INGEST_TOKEN is empty")
        sys.exit(2)
    log(f"live-racer starting: tick={TICK_SECONDS}s models={MODELS}")
    while True:
        try:
            await one_race()
        except Exception as e:  # noqa: BLE001
            log(f"race error: {e}")
        await asyncio.sleep(TICK_SECONDS)


if __name__ == "__main__":
    asyncio.run(main())
