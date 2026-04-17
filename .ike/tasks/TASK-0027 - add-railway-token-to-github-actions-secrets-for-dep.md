---
id: TASK-0027
title: 'add RAILWAY_TOKEN to GitHub Actions secrets for deploy workflow'
status: To Do
created: '2026-04-17'
priority: Urgent
---

The new `.github/workflows/deploy.yml` replaces the broken Railway GitHub auto-deploy with an explicit CI-driven deploy.

**Critical finding from `railguey_doctor`:** the Railway token currently in `.env.local` returns `Could not resolve project from token` — it's either expired, revoked, or scoped to a different project. This is almost certainly why auto-deploy silently died.

Steps:

1. **Generate a fresh token.** A *project token* is preferred (narrow scope): Railway → the live-eidosagi-com project → Settings → Tokens → Create. Or an account token at https://railway.com/account/tokens.
2. **Add to GitHub.** https://github.com/eidos-agi/live-eidosagi-com/settings/secrets/actions → New repository secret → name `RAILWAY_TOKEN`, value = the token.
3. **(Optional) Add repo variables** if the service or environment isn't the default:
   - `RAILWAY_SERVICE` (default: `live-eidosagi-com`)
   - `RAILWAY_ENVIRONMENT` (default: `production`)
4. **Trigger a deploy.** Either push any commit to main, or hit "Run workflow" on the Actions tab for `Deploy to Railway`.
5. **(Optional but recommended) Update `.env.local` too** with the same fresh token so `railguey_doctor` + local `railway` CLI work again.

Why this matters: PR #61 (Qwen-authored page) merged 20+ min ago and still returns 404 on the live site. Every pending PR (#63 research nav, #64 models registry, #65 motion/life) is invisible until deploys work.

Acceptance: Actions tab shows a green run for `Deploy to Railway`, and `curl -I https://live.eidosagi.com/research/eidos-local-log` returns 200 within ~5 minutes after the workflow finishes.
