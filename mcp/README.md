# eidos-live MCP

Thin HTTP-client MCP for **live.eidosagi.com**. Logs session events and
benchmark telemetry to the site's `/api/ingest` endpoint. The site owns
the schema (SQLite on a Railway volume); this MCP owns nothing.

## Install

```bash
cd live-eidosagi-com/mcp
pip install -e .
```

Then add it to Claude Code:

```bash
claude mcp add --transport stdio eidos-live \
  -- python -m eidos_live
```

## Env vars

```bash
export EIDOS_LIVE_URL=https://live.eidosagi.com          # default
export EIDOS_LIVE_INGEST_TOKEN=<matches site INGEST_TOKEN>  # REQUIRED
export EIDOS_SESSION_ID=<session-id>                      # optional
export EIDOS_DEFAULT_ACTOR=claude                         # optional
```

## Tools

| Tool | Purpose |
|---|---|
| `log_event` | Emit a single event to the live feed. Aim for 1 per 1-2 min. |
| `run_start` | Announce a benchmark run (auto-emits a milestone event). |
| `run_end` | Close a benchmark run (auto-emits a milestone event). |
| `log_progress` | Single telemetry sample (tok/s, latency, VRAM, eval idx). |
| `log_score` | Final eval score for a (model, gpu, use_case, test_case). |
| `recent_events` | GET recent events (reverse-chron). |
| `list_runs` | GET recent runs. |
| `health` | Quick self-test: env + reachability. |

## Voice guidance

Event summaries should read like headlines, not logs:

- ✅ `H100 beat A6000 on llama3.1:8b by 120 tok/s`
- ✅ `opened PR #12 — SQLite on Railway volume`
- ❌ `Ran grep across src/**/*.ts`
- ❌ `tool_use: Read(/Users/.../file.ts)`

Grounded, specific, short (< 200 chars). Numbers welcome. No emoji.
