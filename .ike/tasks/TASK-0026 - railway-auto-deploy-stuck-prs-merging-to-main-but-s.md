---
id: TASK-0026
title: 'railway auto-deploy stuck: PRs merging to main but site not rebuilding'
status: To Do
created: '2026-04-17'
priority: Urgent
---

Symptom: PR #61 (the Qwen-authored `/research/eidos-local-log` page) merged to main at 20:36 UTC. 10+ minutes later `curl https://live.eidosagi.com/research/eidos-local-log` still returns 404. The homepage serves and the live feed is still updating (GitHub webhooks, benchmark events, /api/savings), so the Next.js service is alive — it's just running an older build.

There is no `.github/workflows/` directory in this repo, so deploys must be coming from Railway's GitHub-app auto-deploy. That appears to be the broken link.

Why it matters: the entire ADR-005 payoff — a user-visible page authored end-to-end by Qwen on the H100 — is invisible to visitors. Every minute the page is 404 is a minute the local-silicon story is untold.

Fix options:
1. Check Railway dashboard → live-eidosagi-com service → Deployments. Is the latest commit `351eec4` (PR #61 merge) showing as DEPLOYED, FAILED, or not picked up at all?
2. If auto-deploy is off: re-enable the GitHub trigger, or add a minimal `.github/workflows/deploy.yml` calling `railway up` on push-to-main.
3. If the deploy FAILED: check build logs for the cause and file a follow-up.

Acceptance: push a trivial commit to main, observe a new deploy fire within 2 minutes, and `/research/eidos-local-log` returns 200.
