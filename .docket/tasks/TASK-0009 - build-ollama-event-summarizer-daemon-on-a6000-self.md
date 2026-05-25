---
id: TASK-0009
title: Build Ollama event-summarizer daemon on A6000 (self-cheapening Phase 4)
status: To Do
created: '2026-04-17'
priority: High
milestone: Phase 4 — Self-Cheapening Loop
---
Python daemon on the A6000 Thunder instance. Subscribes to a Redis/SQLite queue (or pulls from a new `raw_event_hints` table) of "things to narrate" — commit pushes, subagent completions, benchmark milestones. For each item: prompt llama3.1:8b for a <= 150-char headline, POST to /api/ingest with actor='local-llm', kind matching the source. Include latency_ms + tokens + a running $-saved counter in `details`.

**Acceptance**:
1. Daemon runs 24/7 as a systemd-style service on the A6000.
2. At least one live event on live.eidosagi.com appears with actor='local-llm' visible in the ActivitySidebar.
3. A new API route /api/savings returns {local_event_count, hosted_event_count, usd_saved_estimate}, and a header widget consumes it.
