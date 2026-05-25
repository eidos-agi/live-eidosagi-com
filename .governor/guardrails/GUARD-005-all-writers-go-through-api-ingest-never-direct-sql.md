---
id: "GUARD-005"
type: "guardrail"
title: "All writers go through /api/ingest \u2014 never direct SQLite access"
status: "active"
date: "2026-04-17"
---

The website owns the SQLite file at /data/eidos-live.sqlite on the Railway volume. Every external writer — the eidos-live MCP, benchmark runners on Thunder GPUs, GitHub webhooks, future A6000 narrator daemon — POSTs to /api/ingest with X-Ingest-Token. Preserves the single-writer invariant SQLite requires; keeps the secret surface tiny.
