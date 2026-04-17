#!/usr/bin/env python3
"""Minimal agent harness — Qwen 2.5 72B on the H100 drives a tool-using loop.

This is ADR-005 step 3: prove an open-weights model can run an agent loop
end-to-end without Anthropic in the critical path.

Loop:
  1. Send {system, user, prior tool results} to Ollama's /v1/chat/completions
     via SSH to the H100.
  2. If Qwen emits tool_calls, run each locally, append tool role messages.
  3. Repeat until finish_reason='stop' or max_turns exhausted.
  4. Log each turn to /api/ingest with actor='eidos-local' kind='action'
     (these bypass the narrator suppression gate because they're real
     agent actions, not drifty narration).

Tools exposed:
  - log_event(summary, kind): emit a feed event via /api/ingest
  - fetch_url(url): GET a URL on the live site, return first 400 chars
  - get_time(): current UTC iso
  - done(summary): declare task complete

Usage:
  INGEST_TOKEN=... python3 scripts/qwen-harness.py "<task>"
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
import urllib.request
from pathlib import Path
from typing import Any

INGEST_URL = "https://live.eidosagi.com"
INGEST_TOKEN = os.environ.get("INGEST_TOKEN", "")
H100_KEY = str(Path.home() / ".thunder" / "keys" / "vx7agf6f")
H100_PORT = "32448"
H100_HOST = "62.169.159.125"
MODEL = os.environ.get("QWEN_MODEL", "qwen3.6:35b-a3b")
SESSION = "qwen-harness-proof"
MAX_TURNS = 8
MAX_TOKENS = int(os.environ.get("QWEN_MAX_TOKENS", "1500"))


def ingest(kind: str, payload: dict) -> None:
    data = json.dumps({"kind": kind, "payload": payload}).encode()
    req = urllib.request.Request(f"{INGEST_URL}/api/ingest", data=data, method="POST")
    req.add_header("content-type", "application/json")
    req.add_header("x-ingest-token", INGEST_TOKEN)
    try:
        urllib.request.urlopen(req, timeout=10).read()
    except Exception as e:
        print(f"[ingest error] {e}", flush=True)


def log_event(summary: str, kind: str = "action", icon: str | None = None, details: dict | None = None) -> None:
    ingest("event", {
        "sessionId": SESSION,
        "actor": "eidos-local",
        "kind": kind,
        "summary": summary[:190],
        "icon": icon or "bolt",
        "details": details or {},
    })


TOOLS = [
    {"type": "function", "function": {
        "name": "log_event",
        "description": "Emit a one-line headline to the activity feed. Under 150 chars.",
        "parameters": {
            "type": "object",
            "properties": {
                "summary": {"type": "string"},
                "kind": {"type": "string", "enum": ["action", "observation", "milestone"], "default": "action"},
            },
            "required": ["summary"],
        },
    }},
    {"type": "function", "function": {
        "name": "emit_paragraph",
        "description": "Author a multi-sentence paragraph (up to 1200 chars) that another agent will commit to the repo. Use when you need to write PROSE, not a headline. Returns the full content verbatim.",
        "parameters": {
            "type": "object",
            "properties": {
                "slot": {"type": "string", "description": "Short label identifying what the paragraph is for (e.g. 'migration-progress-log')."},
                "content": {"type": "string", "description": "The full paragraph, up to 1200 chars. Will be saved verbatim."},
            },
            "required": ["slot", "content"],
        },
    }},
    {"type": "function", "function": {
        "name": "fetch_url",
        "description": "Fetch a page at live.eidosagi.com and return the first 400 chars of its HTML body.",
        "parameters": {
            "type": "object",
            "properties": {"url": {"type": "string", "description": "Absolute URL starting with https://live.eidosagi.com/"}},
            "required": ["url"],
        },
    }},
    {"type": "function", "function": {
        "name": "get_time",
        "description": "Return the current UTC time as an ISO 8601 string.",
        "parameters": {"type": "object", "properties": {}},
    }},
    {"type": "function", "function": {
        "name": "done",
        "description": "Declare the task complete. Provide a one-line summary of what was accomplished.",
        "parameters": {
            "type": "object",
            "properties": {"summary": {"type": "string"}},
            "required": ["summary"],
        },
    }},
]


def call_qwen(messages: list[dict]) -> dict:
    """POST to the H100's Ollama OAI-compat endpoint via SSH stdin pipe."""
    payload = json.dumps({
        "model": MODEL,
        "messages": messages,
        "tools": TOOLS,
        "stream": False,
        "max_tokens": MAX_TOKENS,
    })
    remote = "curl -s -X POST http://localhost:11434/v1/chat/completions -H 'content-type: application/json' --data-binary @-"
    cmd = ["ssh", "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=no",
           "-p", H100_PORT, "-i", H100_KEY, f"ubuntu@{H100_HOST}", remote]
    t0 = time.time()
    proc = subprocess.run(cmd, input=payload.encode(), capture_output=True, timeout=120)
    if proc.returncode != 0:
        raise RuntimeError(f"ssh rc={proc.returncode}: {proc.stderr.decode()[:200]}")
    dt = time.time() - t0
    data = json.loads(proc.stdout.decode())
    return {"response": data, "latency_s": round(dt, 1)}


def exec_tool(name: str, args_json: str) -> str:
    try:
        args = json.loads(args_json) if args_json else {}
    except Exception:
        args = {}
    if name == "log_event":
        log_event(args.get("summary", ""), args.get("kind", "action"))
        return "ok"
    if name == "emit_paragraph":
        slot = args.get("slot", "untitled").replace("/", "-")[:64]
        content = args.get("content", "")[:1200]
        path = Path("/tmp") / f"qwen-emit-{slot}.txt"
        path.write_text(content)
        log_event(
            f"emit_paragraph · {slot} · {len(content)} chars",
            kind="action",
            details={"slot": slot, "path": str(path), "chars": len(content)},
        )
        return f"saved {len(content)} chars to {path}"
    if name == "fetch_url":
        url = args.get("url", "")
        if not url.startswith("https://live.eidosagi.com/"):
            return "error: url must be on live.eidosagi.com"
        try:
            req = urllib.request.Request(url, method="GET")
            body = urllib.request.urlopen(req, timeout=10).read().decode(errors="replace")
            return body[:400]
        except Exception as e:
            return f"fetch error: {e}"
    if name == "get_time":
        return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    if name == "done":
        return "acknowledged"
    return f"unknown tool: {name}"


def run(task: str) -> None:
    if not INGEST_TOKEN:
        print("INGEST_TOKEN is required", flush=True)
        sys.exit(2)

    log_event(
        f"qwen-harness boot — Qwen 2.5 72B on H100 assigned task: {task[:80]}",
        kind="milestone",
        icon="rocket",
        details={"model": MODEL, "session": SESSION, "adr": "ADR-005", "step": 3},
    )

    messages: list[dict] = [
        {"role": "system", "content": (
            "You are Eidos, running on local silicon (Qwen 2.5 72B on an H100) for the first time. "
            "You have 4 tools. Use them to accomplish the task, then call `done`. "
            "Keep tool args minimal and JSON-valid. One tool call per turn."
        )},
        {"role": "user", "content": task},
    ]

    done = False
    for turn in range(1, MAX_TURNS + 1):
        print(f"\n--- turn {turn} ---", flush=True)
        result = call_qwen(messages)
        resp = result["response"]
        msg = resp["choices"][0]["message"]
        finish = resp["choices"][0].get("finish_reason")
        usage = resp.get("usage", {})
        latency = result["latency_s"]
        print(f"  finish={finish}  latency={latency}s  tokens={usage}", flush=True)

        # Append assistant turn verbatim (preserve tool_calls)
        messages.append(msg)

        tool_calls = msg.get("tool_calls") or []
        if tool_calls:
            for tc in tool_calls:
                fn = tc["function"]
                name = fn["name"]
                args = fn.get("arguments", "")
                print(f"  tool call: {name}({args[:120]})", flush=True)
                result_str = exec_tool(name, args)
                print(f"    -> {result_str[:120]}", flush=True)
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.get("id", f"call_{turn}_{name}"),
                    "content": result_str,
                })
                if name == "done":
                    done = True
        else:
            print(f"  content: {(msg.get('content') or '')[:200]}", flush=True)

        if done:
            break
        if finish == "stop":
            break

    log_event(
        f"qwen-harness completed task in {turn} turn(s). done={done}",
        kind="milestone",
        icon="check" if done else "warn",
        details={"turns": turn, "done": done, "adr": "ADR-005", "step": 3},
    )


if __name__ == "__main__":
    task = " ".join(sys.argv[1:]) or (
        "Introduce yourself on the live feed as Qwen 2.5 72B running on the H100 — "
        "call log_event with a one-line welcome. Then fetch https://live.eidosagi.com/api/savings "
        "and log one observation about the current local_share. Then call done."
    )
    run(task)
