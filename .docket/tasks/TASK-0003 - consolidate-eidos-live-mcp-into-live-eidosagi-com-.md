---
id: TASK-0003
title: Consolidate eidos-live MCP into live-eidosagi-com/mcp/ subfolder + install
status: To Do
created: '2026-04-17'
priority: High
milestone: Phase 2 — Self-Portrait Loop
---
Move the HTTP-client MCP into the site repo, retire the standalone eidos-live-mcp repo with a README pointer. `claude mcp add --transport stdio eidos-live python -m eidos_live.server`. Test one log_event from this very session to populate the feed.
