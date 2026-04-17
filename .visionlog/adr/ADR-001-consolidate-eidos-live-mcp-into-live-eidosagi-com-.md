---
id: "ADR-001"
type: "decision"
title: "Consolidate eidos-live MCP into live-eidosagi-com/mcp/ subfolder"
status: "accepted"
date: "2026-04-17"
---

**Context**: Originally scaffolded as a standalone repo (`eidos-agi/eidos-live-mcp`). User observed one schema + one deploy + one source of truth is simpler.

**Decision**: The MCP lives in-tree at `live-eidosagi-com/mcp/`. It is a pure HTTP client to the site's own `/api/ingest` — no DB driver, no migrations.

**Consequences**:
- `eidos-live-mcp` standalone repo retired with a README pointer to the new location.
- The website repo is the sole source of truth for schema, migrations, and the MCP tool surface.
- Installation: `claude mcp add --transport stdio eidos-live python -m eidos_live.server` with `EIDOS_LIVE_URL` and `EIDOS_LIVE_INGEST_TOKEN` env vars.
