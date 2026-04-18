---
id: TASK-0050
title: 'migrate live.eidosagi.com off Railway onto the EPYC bare-metal (supersedes partial TASK-0042, research project 6e4d5fb9)'
status: To Do
created: '2026-04-17'
priority: High
---

**User direction (2026-04-17 ~23:25 UTC):** "we need to get this moved over to the eidos server, set up a task to do that, and then research it."

**The ask:** move the Next.js app, SQLite DB, and all runtime dependencies of live.eidosagi.com off Railway's 'web' service onto the HOSTKEY EPYC bare-metal at `epyc-56223.eidosagi.com` (162.120.18.7). Keep the live event running throughout — no visible dark period for visitors.

**Why this is the keystone of GOAL-002:** TASK-0042 covers moving the live-racer; this covers the *site itself*. Once this lands, live.eidosagi.com runs on hardware we own, same place that will host the multi-agent harness (TASK-0045) + doc retrieval index (TASK-0044). Everything converges on one machine.

**Research project (decide before doing):** `b24804ce-d343-4b85-aced-c0df8ee3b913` root, subproject `6e4d5fb9-6ff8-4bdf-ae44-2726be1abb04` (migrate-to-epyc). Populate candidates (stay / full-migrate / hybrid) with sourced claims on: DB-persistence risk, TLS cert migration, domain switchover, CI/CD rewrite scope, rollback path, Railway bill $ saved, EPYC RAM headroom. Lock criteria, score, decide. THEN execute.

**Migration steps (draft — subject to research outcome):**

1. **Inventory the Railway stack.** `railway status --json` gives service name (`web`), env vars, volume mount (`/data`). Snapshot the current SQLite file (`eidos-live.sqlite`) and any `.sqlite-wal` sidecar.
2. **Prepare EPYC.** Docker + Caddy (reverse proxy with auto-TLS from Let's Encrypt). Dockerfile for the Next.js app (blocked by TASK-0034's Dockerfile half — need to write one). `docker compose up -d` locally to verify before pushing.
3. **DB migration.** `scp` the SQLite file to the EPYC at `/srv/live-eidosagi/data/eidos-live.sqlite`. Run migrations once on cold-start to confirm they're idempotent.
4. **DNS cutover.** Cloudflare A record for live.eidosagi.com flips from Railway's edge to EPYC's IP. Keep Railway service warm during cutover as a 60-second rollback target.
5. **CI/CD rewrite.** `.github/workflows/deploy.yml` currently runs `railway up`. Change to: build Docker image, push to a registry (GitHub Packages), SSH into EPYC, pull + restart compose. Alternative: just SSH in and `git pull && docker compose up -d --build`.
6. **SSE verification.** The `/api/events/stream` + `/api/chat/stream` routes are the most latency-sensitive. Test that Caddy's reverse proxy correctly passes through SSE without buffering. (Caddy does by default; nginx needs `proxy_buffering off`.)
7. **Cutover itself.** Low-traffic window (weekend morning local time). Freeze new commits. DB-snapshot Railway → scp → EPYC. DNS TTL → 60s, flip, watch. Roll back within 60s if any SSE / home / feed route regresses.
8. **Decommission Railway.** Only after 48 h of green on EPYC. Keep the Railway project in billable-paused state for 2 weeks as a final rollback insurance, then delete.

**Acceptance:**
- `dig +short live.eidosagi.com` → EPYC IP
- `curl -I https://live.eidosagi.com/` → 200 served by Caddy, not Railway edge
- `/api/events/stream` pushes events within 1 s of `/api/ingest` POST (no SSE buffering)
- `/api/savings` shows the same `total_events` pre- and post-cutover (proves the DB ferried)
- The live-racer (TASK-0042) now points at the EPYC's local `/api/ingest`, not over the public internet
- Railway monthly bill → ~$0, EPYC bill unchanged at $299.64

**Blocker:** needs a Dockerfile (TASK-0034 covered but deferred — now becomes a prerequisite for this). Needs Caddy config + TLS cert for live.eidosagi.com on the EPYC. Needs user approval for the cutover window.
