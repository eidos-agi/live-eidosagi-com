---
id: TASK-0034
title: 'raise railguey doctor score to 10/10 — Dockerfile, gitignore nit, clean working tree'
status: To Do
created: '2026-04-17'
priority: Normal
---

`railguey_doctor` currently scores 6/10 on workspace. Remaining warnings to close:

1. **Dockerfile** (warn): Nixpacks auto-detect is fine but not reproducible. Write a minimal multi-stage Dockerfile: node:20-alpine builder with `pnpm install --frozen-lockfile && pnpm build`, slim runtime. Also pins the Node version across Railway deploys.
2. **.gitignore / .env.local** (warn, false-positive): doctor doesn't recognize the `.env*.local` glob as covering `.env.local`. Add an explicit `.env.local` line alongside the glob so the static check is satisfied.
3. **Uncommitted files** (warn): clean up stale `mcp/src/eidos_live/__pycache__/*.pyc` tracked-modifications, delete the two orphaned `.ike/completed/*` entries that keep re-appearing as deleted-from-main.
4. **Service + project Railway API** (fail): doctor hits Backboard GraphQL with the project token and gets `Could not resolve project from token`. The same token works for `railway status` CLI. Either the token scope isn't Backboard-compatible (file a fix with railguey) or we need an account-scoped token with Backboard access. Low priority — doesn't affect deploys, just the doctor's read-only checks.

Acceptance: `railguey_doctor` returns 10/10 workspace score. Service/project scores may stay at 0/0 pending the Backboard token scope question.
