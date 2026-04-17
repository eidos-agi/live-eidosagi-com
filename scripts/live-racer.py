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
  RACER_MODELS         default 'llama3.1:8b,qwen2.5:14b'
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
    for m in os.environ.get("RACER_MODELS", "llama3.1:8b").split(",")
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
            for r in GPUS
        ],
        "models": [model],
        "startedAt": started_at,
        "note": "live-racer · one prompt, three GPUs, in parallel",
    })

    results = await asyncio.gather(
        *[race_one_gpu(r, model) for r in GPUS]
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
