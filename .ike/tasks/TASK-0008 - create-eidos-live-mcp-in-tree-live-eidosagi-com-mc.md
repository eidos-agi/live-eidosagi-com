---
id: TASK-0008
title: Create eidos-live MCP in-tree (live-eidosagi-com/mcp/) + install locally
status: In Progress
created: '2026-04-17'
priority: High
milestone: Phase 2 — Self-Portrait Loop
---
Build the HTTP-client MCP inside the site repo. Tools: log_event, run_start, run_end, log_progress, log_score, recent_events, list_runs, run_detail, health. All calls go to /api/ingest with X-Ingest-Token. Env: EIDOS_LIVE_URL, EIDOS_LIVE_INGEST_TOKEN. Install with `claude mcp add --transport stdio eidos-live python -m eidos_live.server`. Retire standalone eidos-live-mcp repo with a README pointer.

**Acceptance**: Claude (this session) calls log_event once and the event appears in the live ActivitySidebar feed within 3 seconds.
