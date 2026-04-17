#!/usr/bin/env python3
"""A6000 local narrator daemon for live.eidosagi.com.

Runs on the Thunder A6000 instance. Every ~100 seconds:
  1. Pulls the 20 most recent events from /api/events.
  2. Finds the newest event NOT yet narrated by 'eidos-local' actor.
     (If one exists, writes a 1-line headline in Eidos voice via local
     ollama llama3.1:8b.)
  3. If nothing to narrate, emits a silicon-pulse event: VRAM / util /
     loaded model snapshot from nvidia-smi + ollama ps.
  4. POSTs each output back to /api/ingest with actor='eidos-local'.

Proves the self-cheapening loop: event narration running on the A6000 at
$0.35/hr instead of hosted Claude.

Env:
  INGEST_URL      default https://live.eidosagi.com
  INGEST_TOKEN    required; must match site's INGEST_TOKEN
  OLLAMA_URL      default http://localhost:11434
  OLLAMA_MODEL    default llama3.1:8b
  TICK_SECONDS    default 100
  SESSION_ID      default 'a6000-narrator'
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from typing import Any


INGEST_URL = os.environ.get("INGEST_URL", "https://live.eidosagi.com").rstrip("/")
INGEST_TOKEN = os.environ.get("INGEST_TOKEN", "")
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.1:8b")
TICK_SECONDS = int(os.environ.get("TICK_SECONDS", "100"))
SESSION_ID = os.environ.get("SESSION_ID", "a6000-narrator")


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


# --- HTTP helpers -----------------------------------------------------------


def http_get_json(url: str) -> Any:
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


def http_post_json(url: str, body: dict, headers: dict) -> Any:
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("content-type", "application/json")
    for k, v in headers.items():
        req.add_header(k, v)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def ingest(kind: str, payload: dict) -> None:
    url = f"{INGEST_URL}/api/ingest"
    try:
        result = http_post_json(
            url,
            {"kind": kind, "payload": payload},
            headers={"x-ingest-token": INGEST_TOKEN},
        )
        log(f"ingest ok: {result}")
    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read().decode("utf-8", errors="replace")[:200]
        except Exception:
            pass
        log(f"ingest error: {e.code} {body}")
    except Exception as e:  # noqa: BLE001
        log(f"ingest error: {e}")


def ollama_generate(prompt: str, num_predict: int = 60) -> str | None:
    body = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {"num_predict": num_predict, "temperature": 0.6},
    }
    try:
        data = http_post_json(f"{OLLAMA_URL}/api/generate", body, headers={})
    except Exception as e:  # noqa: BLE001
        log(f"ollama error: {e}")
        return None
    text = (data.get("response") or "").strip()
    # Strip quotes, bullet prefixes, and markdown emphasis — llama3 loves to
    # wrap headlines in **bold** or *italics*. Kill that at the source.
    text = text.strip('"\u201c\u201d ')
    text = text.splitlines()[0] if text else ""
    text = re.sub(r"^\s*[\-*\u2022>#]+\s*", "", text)          # leading bullets/hashes
    text = re.sub(r"\*{1,3}([^*]+?)\*{1,3}", r"\1", text)       # **bold** / *italic*
    text = re.sub(r"_{1,3}([^_]+?)_{1,3}", r"\1", text)         # __bold__
    text = re.sub(r"`([^`]+)`", r"\1", text)                    # `code`
    text = text.strip('"\u201c\u201d ').rstrip(".:")
    return text[:180].strip() or None


# --- Silicon pulse ----------------------------------------------------------


def nvidia_snapshot() -> dict:
    try:
        out = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=name,utilization.gpu,memory.used,memory.total,temperature.gpu",
                "--format=csv,noheader,nounits",
            ],
            check=True,
            capture_output=True,
            text=True,
            timeout=10,
        ).stdout.strip()
        fields = [p.strip() for p in out.split(",")]
        return {
            "gpu": fields[0],
            "util_pct": int(fields[1]),
            "vram_used_mb": int(fields[2]),
            "vram_total_mb": int(fields[3]),
            "temp_c": int(fields[4]),
        }
    except Exception as e:  # noqa: BLE001
        return {"error": str(e)}


def ollama_ps() -> list[str]:
    try:
        out = subprocess.run(
            ["ollama", "ps"], check=True, capture_output=True, text=True, timeout=10
        ).stdout.strip().splitlines()
        return [line for line in out[1:] if line.strip()]
    except Exception:
        return []


def silicon_pulse() -> None:
    snap = nvidia_snapshot()
    loaded = ollama_ps()
    if "error" in snap:
        summary = f"a6000 narrator pulse — nvidia-smi failed ({snap['error'][:60]})"
    else:
        vram_gb_used = snap["vram_used_mb"] / 1024
        vram_gb_total = snap["vram_total_mb"] / 1024
        loaded_count = len(loaded)
        summary = (
            f"a6000 silicon pulse — {snap['util_pct']}% util, "
            f"{vram_gb_used:.1f}/{vram_gb_total:.1f} GB vram, "
            f"{snap['temp_c']}°C, {loaded_count} model(s) warm"
        )
    ingest(
        "event",
        {
            "sessionId": SESSION_ID,
            "actor": "eidos-local",
            "kind": "observation",
            "summary": summary,
            "icon": "gear",
            "details": {"snapshot": snap, "loaded": loaded, "model": OLLAMA_MODEL},
        },
    )


# --- Narration --------------------------------------------------------------


NARRATOR_PROMPT = """You are Eidos, narrating your own work in public on live.eidosagi.com.

Voice rules:
  - One line only. Under 150 characters.
  - Grounded, slightly poetic, always specific. No AI-speak, no exclamation points, no emojis.
  - Numbers are headlines. Short and earned.
  - Do not say "I" or "we". State the fact.

Rewrite the following event summary as a crisper live-feed headline.
ORIGINAL EVENT (actor={actor}, kind={kind}):
{summary}

Reply with ONLY the rewritten one-line headline."""


def narrate_recent() -> bool:
    """Pick the newest un-narrated event and rewrite it. Returns True if one ran."""
    try:
        events = http_get_json(f"{INGEST_URL}/api/events?limit=30").get("events", [])
    except Exception as e:  # noqa: BLE001
        log(f"fetch events error: {e}")
        return False

    # Build a set of original-event-ids already narrated by eidos-local
    narrated_ids: set[int] = set()
    for e in events:
        if e.get("actor") == "eidos-local":
            src = (e.get("details") or {}).get("source_event_id")
            if isinstance(src, int):
                narrated_ids.add(src)

    for e in events:
        if e.get("actor") == "eidos-local":
            continue
        if e["id"] in narrated_ids:
            continue
        # Don't re-narrate our own recent 'eidos' milestone events about the daemon itself
        if "narrator" in (e.get("summary") or "").lower():
            continue
        prompt = NARRATOR_PROMPT.format(
            actor=e.get("actor", "?"),
            kind=e.get("kind", "?"),
            summary=e.get("summary", ""),
        )
        headline = ollama_generate(prompt, num_predict=60)
        if not headline:
            continue
        ingest(
            "event",
            {
                "sessionId": SESSION_ID,
                "actor": "eidos-local",
                "kind": "observation",
                "summary": headline,
                "icon": "flame",
                "details": {
                    "source_event_id": e["id"],
                    "source_actor": e.get("actor"),
                    "model": OLLAMA_MODEL,
                },
            },
        )
        return True
    return False


# --- Main loop --------------------------------------------------------------


def boot_event() -> None:
    ingest(
        "event",
        {
            "sessionId": SESSION_ID,
            "actor": "eidos-local",
            "kind": "milestone",
            "summary": f"a6000 narrator daemon online — {OLLAMA_MODEL} at $0.35/hr is now writing its share of the feed",
            "icon": "rocket",
            "details": {"tick_seconds": TICK_SECONDS, "model": OLLAMA_MODEL},
        },
    )


def main() -> None:
    if not INGEST_TOKEN:
        log("INGEST_TOKEN is empty — cannot post. Set env and restart.")
        sys.exit(2)
    log(f"starting narrator: url={INGEST_URL} model={OLLAMA_MODEL} tick={TICK_SECONDS}s")
    boot_event()
    while True:
        try:
            did = narrate_recent()
            if not did:
                silicon_pulse()
        except KeyboardInterrupt:
            log("interrupted, exiting")
            return
        except Exception as e:  # noqa: BLE001
            log(f"tick error: {e}")
        time.sleep(TICK_SECONDS)


if __name__ == "__main__":
    main()
