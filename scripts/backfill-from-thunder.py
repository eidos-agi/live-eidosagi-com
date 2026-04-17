#!/usr/bin/env python3
"""Backfill completed Thunder benchmark runs into live.eidosagi.com.

Reads ~/llm-testing/benchmarks/results/profile.json +
      ~/llm-testing/eval/results/eval_*.json
on each Thunder instance and posts:
  run_start  (with gpus + models)
  log_progress per profile row (tok/s as a single sample)
  log_score per eval score row
  run_end    (completed)

Idempotent-ish: run_id is a deterministic hash of (gpu, profile timestamp, file list)
so re-running doesn't create duplicates.

Intended to run LOCALLY (not on Thunder) against https://live.eidosagi.com —
it pulls the JSON artifacts via scp-over-ssh into /tmp, parses them, POSTs.

Usage:
  INGEST_URL=https://live.eidosagi.com \
  INGEST_TOKEN=... \
  python3 scripts/backfill-from-thunder.py
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

INGEST_URL = os.environ.get("INGEST_URL", "https://live.eidosagi.com").rstrip("/")
INGEST_TOKEN = os.environ.get("INGEST_TOKEN", "")

KEY_DIR = Path.home() / ".thunder" / "keys"

# (gpu-label, ssh-port, ssh-key, ip, gpu-type, vram_gb, cost_per_hour)
INSTANCES = [
    ("A6000", "30117", "jlaa7b09", "69.19.136.6",  "A6000", 48, 0.35),
    ("A100",  "32079", "uwpfv1j3", "185.216.21.95","A100",  80, 0.78),
    ("H100",  "32448", "vx7agf6f", "62.169.159.125","H100", 80, 2.49),
]


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def http_post(url: str, body: dict, headers: dict) -> dict:
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("content-type", "application/json")
    for k, v in headers.items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body_str = ""
        try:
            body_str = e.read().decode("utf-8", errors="replace")[:200]
        except Exception:
            pass
        return {"ok": False, "status": e.code, "error": body_str}


def ingest(kind: str, payload: dict) -> dict:
    return http_post(
        f"{INGEST_URL}/api/ingest",
        {"kind": kind, "payload": payload},
        headers={"x-ingest-token": INGEST_TOKEN},
    )


def ssh_cat(port: str, key: str, ip: str, remote_path: str) -> str | None:
    cmd = [
        "ssh",
        "-o", "BatchMode=yes",
        "-o", "StrictHostKeyChecking=no",
        "-p", port,
        "-i", str(KEY_DIR / key),
        f"ubuntu@{ip}",
        f"cat {remote_path}",
    ]
    try:
        out = subprocess.run(
            cmd, check=True, capture_output=True, text=True, timeout=30
        )
        return out.stdout
    except subprocess.CalledProcessError:
        return None


def ssh_ls(port: str, key: str, ip: str, remote_glob: str) -> list[str]:
    cmd = [
        "ssh",
        "-o", "BatchMode=yes",
        "-p", port,
        "-i", str(KEY_DIR / key),
        f"ubuntu@{ip}",
        f"ls -1 {remote_glob} 2>/dev/null || true",
    ]
    try:
        out = subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=15)
        return [line.strip() for line in out.stdout.splitlines() if line.strip()]
    except Exception:
        return []


def run_id_for(label: str, profile: dict, eval_files: list[str]) -> str:
    h = hashlib.sha1()
    h.update(label.encode())
    h.update(json.dumps(profile.get("timestamp", ""), sort_keys=True).encode())
    h.update("\n".join(sorted(eval_files)).encode())
    return f"thunder-{label.lower()}-{h.hexdigest()[:10]}"


def process_instance(label: str, port: str, key: str, ip: str,
                     gpu_type: str, vram_gb: int, cost_hr: float) -> None:
    log(f"=== {label} @ {ip}:{port} ===")

    profile_raw = ssh_cat(port, key, ip, "/home/ubuntu/llm-testing/benchmarks/results/profile.json")
    if not profile_raw:
        log(f"  no profile.json found, skipping")
        return
    try:
        profile = json.loads(profile_raw)
    except json.JSONDecodeError as e:
        log(f"  profile.json parse error: {e}")
        return

    eval_files = ssh_ls(port, key, ip, "/home/ubuntu/llm-testing/eval/results/eval_*.json")
    # Skip _partial and _summary variants
    eval_files = [f for f in eval_files if "_partial" not in f and "_summary" not in f]

    run_id = run_id_for(label, profile, eval_files)
    models = sorted({
        str(level.get("model"))
        for lvl, level in (profile.get("levels") or {}).items()
        if level.get("model")
    })
    gpu_id = f"thunder-{label.lower()}"
    started_at = profile.get("timestamp") or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    log(f"  run_id={run_id} models={len(models)} eval_files={len(eval_files)}")

    r = ingest("run_start", {
        "runId": run_id,
        "sessionId": "thunder-backfill",
        "promptLabel": f"{label} eval suite (backfill from profile.json)",
        "gpus": [{
            "name": gpu_id,
            "type": gpu_type,
            "vramGB": vram_gb,
            "costPerHour": cost_hr,
        }],
        "models": models,
        "startedAt": started_at,
        "note": "backfilled from /home/ubuntu/llm-testing/benchmarks/results/profile.json",
    })
    log(f"  run_start: {r}")

    prog_count = 0
    for lvl_key, level in (profile.get("levels") or {}).items():
        model = level.get("model")
        if not model:
            continue
        tok_s = level.get("avg_tokens_per_sec") or 0
        latency_s = level.get("avg_latency_s") or 0
        ram_mb = (level.get("peak_rss_delta_mb") or 0)
        if tok_s > 0:
            ingest("progress", {
                "runId": run_id,
                "gpuId": gpu_id,
                "model": model,
                "useCase": "profile",
                "tokPerSec": tok_s,
                "latencyMs": latency_s * 1000 if latency_s else None,
                "vramUsedMb": ram_mb if ram_mb else None,
            })
            prog_count += 1
    log(f"  progress rows: {prog_count}")

    score_count = 0
    for ef in eval_files[:3]:  # newest 3 eval files is plenty for backfill
        raw = ssh_cat(port, key, ip, ef)
        if not raw:
            continue
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        scores = data.get("scores") or []
        for s in scores:
            dims = s.get("dimensions") or {}
            # Normalize dimension keys (eval uses snake_case already)
            ingest("score", {
                "runId": run_id,
                "gpuId": gpu_id,
                "model": s.get("model_tag") or s.get("model") or "unknown",
                "useCase": s.get("use_case") or "unknown",
                "testCaseId": s.get("test_case_id"),
                "composite": s.get("composite_score") or 0,
                "dimensions": dims,
                "tokPerSec": (s.get("performance") or {}).get("tokens_per_second"),
            })
            score_count += 1
            if score_count >= 120:
                break
        if score_count >= 120:
            break
    log(f"  score rows: {score_count}")

    ingest("run_end", {
        "runId": run_id,
        "status": "completed",
        "note": f"backfilled: {prog_count} progress, {score_count} scores",
    })
    ingest("event", {
        "sessionId": "thunder-backfill",
        "actor": "benchmark",
        "kind": "milestone",
        "summary": f"{label} eval suite backfilled — {len(models)} models, {prog_count} tok/s samples, {score_count} scores",
        "icon": "check",
        "relatedRun": run_id,
        "details": {"gpu": label, "models": models, "run_id": run_id},
    })
    log(f"  run_end + milestone emitted")


def main() -> None:
    if not INGEST_TOKEN:
        log("INGEST_TOKEN is empty. export it and retry.")
        sys.exit(2)
    for row in INSTANCES:
        try:
            process_instance(*row)
        except Exception as e:  # noqa: BLE001
            log(f"  error processing {row[0]}: {e}")


if __name__ == "__main__":
    main()
