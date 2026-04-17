"""eidos-live FastMCP server — HTTP client to live.eidosagi.com.

All tools POST to `{EIDOS_LIVE_URL}/api/ingest` with the `X-Ingest-Token`
header. No database driver, no migrations. The website owns the schema.

Env vars:
    EIDOS_LIVE_URL           — site base URL (default https://live.eidosagi.com)
    EIDOS_LIVE_INGEST_TOKEN  — required; must match the site's INGEST_TOKEN
    EIDOS_SESSION_ID         — optional; stamps events with a session
    EIDOS_DEFAULT_ACTOR      — optional; defaults to 'claude'
"""

from __future__ import annotations

import os
import uuid
from typing import Any

import httpx
from mcp.server.fastmcp import FastMCP


mcp = FastMCP("eidos-live")


def _base_url() -> str:
    return os.environ.get("EIDOS_LIVE_URL", "https://live.eidosagi.com").rstrip("/")


def _token() -> str:
    tok = os.environ.get("EIDOS_LIVE_INGEST_TOKEN")
    if not tok:
        raise RuntimeError("EIDOS_LIVE_INGEST_TOKEN is not set")
    return tok


def _session() -> str:
    return (
        os.environ.get("EIDOS_SESSION_ID")
        or os.environ.get("CLAUDE_SESSION_ID")
        or "ambient"
    )


def _default_actor() -> str:
    return os.environ.get("EIDOS_DEFAULT_ACTOR", "claude")


async def _post_ingest(kind: str, payload: dict[str, Any]) -> dict[str, Any]:
    url = f"{_base_url()}/api/ingest"
    headers = {
        "content-type": "application/json",
        "x-ingest-token": _token(),
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(url, json={"kind": kind, "payload": payload}, headers=headers)
    try:
        data = resp.json()
    except Exception:
        data = {"status": resp.status_code, "text": resp.text[:200]}
    if resp.status_code >= 400:
        return {"ok": False, "status": resp.status_code, **data}
    return data


async def _get(path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    url = f"{_base_url()}{path}"
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(url, params=params)
    try:
        data = resp.json()
    except Exception:
        data = {"status": resp.status_code, "text": resp.text[:200]}
    if resp.status_code >= 400:
        return {"ok": False, "status": resp.status_code, **data}
    return data


# -- Event -------------------------------------------------------------------


@mcp.tool()
async def log_event(
    summary: str,
    kind: str = "action",
    actor: str | None = None,
    details: dict[str, Any] | None = None,
    icon: str | None = None,
    related_run: str | None = None,
    session_id: str | None = None,
) -> dict[str, Any]:
    """Log a single event to the live feed on live.eidosagi.com.

    Aim for 1 event per 1-2 minutes of active work: decisions, milestones,
    commits, deploys, blockers, completions. Not every tool call.

    Args:
        summary: One-line headline (< 200 chars). Grounded, specific.
        kind: 'action' | 'decision' | 'observation' | 'milestone' | 'commit' | 'pr'
        actor: defaults to env EIDOS_DEFAULT_ACTOR or 'claude'
        details: optional structured payload (rendered as JSON on details-click)
        icon: lucide-ish name e.g. 'rocket', 'flame', 'check', 'search'
        related_run: optional run id to link this event to
        session_id: override the default session id
    """
    summary = (summary or "").strip()
    if not summary:
        return {"ok": False, "error": "summary required"}
    if len(summary) > 200:
        summary = summary[:197] + "..."
    payload: dict[str, Any] = {
        "sessionId": session_id or _session(),
        "actor": actor or _default_actor(),
        "kind": kind,
        "summary": summary,
    }
    if details is not None:
        payload["details"] = details
    if icon:
        payload["icon"] = icon
    if related_run:
        payload["relatedRun"] = related_run
    return await _post_ingest("event", payload)


# -- Runs --------------------------------------------------------------------


@mcp.tool()
async def run_start(
    gpus: list[dict[str, Any]],
    models: list[str],
    run_id: str | None = None,
    prompt_label: str | None = None,
    note: str | None = None,
    session_id: str | None = None,
) -> dict[str, Any]:
    """Announce a benchmark run. Auto-emits a milestone event.

    Args:
        gpus: [{name, type, vramGB, costPerHour}, ...]
        models: ['llama3.1:8b', ...]
        run_id: if omitted, a uuid4 hex is generated
        prompt_label: human-readable run label
        note: optional free-form note
    """
    rid = run_id or uuid.uuid4().hex[:12]
    payload = {
        "runId": rid,
        "gpus": gpus,
        "models": models,
        "sessionId": session_id or _session(),
    }
    if prompt_label:
        payload["promptLabel"] = prompt_label
    if note:
        payload["note"] = note
    result = await _post_ingest("run_start", payload)
    # Also emit an event so visitors see it
    await _post_ingest(
        "event",
        {
            "sessionId": session_id or _session(),
            "actor": "benchmark",
            "kind": "milestone",
            "summary": f"run {rid} ignited: {', '.join(models)} on {len(gpus)} GPU(s)",
            "icon": "flame",
            "relatedRun": rid,
        },
    )
    return {**result, "runId": rid}


@mcp.tool()
async def run_end(
    run_id: str,
    status: str = "completed",
    note: str | None = None,
) -> dict[str, Any]:
    """Close a benchmark run. Auto-emits a milestone event."""
    payload: dict[str, Any] = {"runId": run_id, "status": status}
    if note:
        payload["note"] = note
    result = await _post_ingest("run_end", payload)
    await _post_ingest(
        "event",
        {
            "sessionId": _session(),
            "actor": "benchmark",
            "kind": "milestone",
            "summary": f"run {run_id} {status}" + (f" — {note}" if note else ""),
            "icon": "check" if status == "completed" else "warn",
            "relatedRun": run_id,
        },
    )
    return result


# -- Progress + scores -------------------------------------------------------


@mcp.tool()
async def log_progress(
    run_id: str,
    gpu_id: str,
    model: str,
    tok_per_sec: float,
    use_case: str | None = None,
    latency_ms: float | None = None,
    vram_used_mb: float | None = None,
    eval_idx: int | None = None,
    eval_total: int | None = None,
) -> dict[str, Any]:
    """Single telemetry sample. Don't spam — batch to ~1-2 Hz at most."""
    payload: dict[str, Any] = {
        "runId": run_id,
        "gpuId": gpu_id,
        "model": model,
        "tokPerSec": tok_per_sec,
    }
    if use_case is not None:
        payload["useCase"] = use_case
    if latency_ms is not None:
        payload["latencyMs"] = latency_ms
    if vram_used_mb is not None:
        payload["vramUsedMb"] = vram_used_mb
    if eval_idx is not None:
        payload["evalIdx"] = eval_idx
    if eval_total is not None:
        payload["evalTotal"] = eval_total
    return await _post_ingest("progress", payload)


@mcp.tool()
async def log_score(
    run_id: str,
    gpu_id: str,
    model: str,
    use_case: str,
    composite: float,
    dimensions: dict[str, Any] | None = None,
    test_case_id: str | None = None,
    tok_per_sec: float | None = None,
) -> dict[str, Any]:
    """A final eval score for one (model, gpu, use_case, test_case)."""
    payload: dict[str, Any] = {
        "runId": run_id,
        "gpuId": gpu_id,
        "model": model,
        "useCase": use_case,
        "composite": composite,
    }
    if dimensions is not None:
        payload["dimensions"] = dimensions
    if test_case_id is not None:
        payload["testCaseId"] = test_case_id
    if tok_per_sec is not None:
        payload["tokPerSec"] = tok_per_sec
    return await _post_ingest("score", payload)


# -- Reads -------------------------------------------------------------------


@mcp.tool()
async def recent_events(
    limit: int = 30,
    session_id: str | None = None,
) -> dict[str, Any]:
    """Fetch the most recent events (reverse-chron)."""
    params: dict[str, Any] = {"limit": limit}
    if session_id:
        params["session"] = session_id
    return await _get("/api/events", params)


@mcp.tool()
async def list_runs(limit: int = 20) -> dict[str, Any]:
    """List recent benchmark runs."""
    return await _get("/api/raw/runs", {})


@mcp.tool()
async def health() -> dict[str, Any]:
    """Report whether the MCP can reach the site + ingest endpoint."""
    base = _base_url()
    get_ok = True
    get_err: str | None = None
    try:
        r = await _get("/api/events", {"limit": 1})
        get_ok = bool(r and not r.get("ok") is False)
    except Exception as e:  # noqa: BLE001
        get_ok = False
        get_err = str(e)
    token_set = bool(os.environ.get("EIDOS_LIVE_INGEST_TOKEN"))
    return {
        "ok": get_ok and token_set,
        "base_url": base,
        "token_set": token_set,
        "events_endpoint_reachable": get_ok,
        "error": get_err,
        "session_id": _session(),
        "default_actor": _default_actor(),
    }


def run() -> None:
    mcp.run()


if __name__ == "__main__":
    run()
