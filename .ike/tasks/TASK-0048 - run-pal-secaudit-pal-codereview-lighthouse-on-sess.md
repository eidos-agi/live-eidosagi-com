---
id: TASK-0048
title: 'run pal:secaudit + pal:codereview + Lighthouse on the session output (close the "Competent" vision bar)'
status: To Do
created: '2026-04-17'
priority: High
---

**Vision context (from `.visionlog/vision.md` must-be-when-done):**
> Competent — methodology page, **pal:secaudit + pal:codereview pass, Lighthouse ≥ 95**

None of the three have been run this session despite ~25 PRs of output. That's the biggest unchecked vision bar — `Beautiful`, `Living`, `Interactive`, `LIVE`, `Properly logged` are all visibly shipped; `Properly cached` and `Properly researched` have active PRs / projects open; `Competent` is the one with nothing.

**What to run:**

1. **pal:secaudit** on the repo root. Focus on the paths this session changed most: `src/app/api/ingest/route.ts` (narrator gate), `src/app/api/events/route.ts`, `scripts/qwen-harness.py` (write_file + run_command allowlists — if PR #74 lands), `.github/workflows/deploy.yml`. High-signal surfaces for auth, input validation, path traversal, command injection.

2. **pal:codereview** on the 8 open PRs. Priority order: #73 caching, #75 BenchmarkPulseServer, #80 race-rotation+GOAL-002, #78 model-detail-pages, #74 harness-widen (needs the most scrutiny — widens autonomous write/push), then the trivial ones.

3. **Lighthouse CI** on the 6 most-trafficked routes:
   - `/` (homepage with SSE + RaceBoard)
   - `/research`
   - `/research/cost-calc` (only client-interactive page)
   - `/research/how-it-works`
   - `/models`
   - `/models/[name]` (dynamic route, after PR #78 merges)

   Target: ≥ 95 performance + accessibility + best-practices on each. CLS, LCP, TBT are the ones most likely to slip given the heavy SSR + live updates.

**Acceptance:**
- One `pal:secaudit` report committed to `.research/pal-audits/2026-04-17-secaudit.md` with any HIGH/CRITICAL findings triaged into ike tasks.
- One `pal:codereview` pass per open PR, with review comments left via `gh pr comment` or posted to `.research/pal-audits/<pr>.md`.
- One Lighthouse report per route committed under `.research/lighthouse/2026-04-17/`, with any route < 95 on any category spawning a remediation ike task.

Blocked on: getting pal:secaudit + pal:codereview access + a machine with the Chrome headless that Lighthouse needs. Not shippable autonomously — requires user authorization (`pal:codereview` can be run from Claude Code but needs the MCP loaded).
