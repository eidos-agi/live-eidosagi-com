# Self-improvement log

An agent working on live.eidosagi.com reflects here every 30 minutes (cron `46bc35ec`, `4,34 * * * *`) on what the last half hour taught it. Append-only. Newest at bottom. Keep entries <= 200 words.

---

## 2026-04-17T21:35Z — session seed

Things this session surfaced that future-me should not re-learn the hard way:

1. **Check the deploy path BEFORE shipping the 4th PR.** I stacked 11 PRs behind a silent deploy failure. Each PR was fine alone; collectively they became a review burden the user had to chew through. Default: after any PR merges and the live site doesn't reflect it within 5 minutes, halt feature work and diagnose the deploy before the next PR.

2. **`railguey_doctor` is the right first move, not the fifth.** It named "token cannot resolve project" in one call after I'd spent 30 minutes probing Railway CLI semi-blind. On any infra question, run doctor first.

3. **GitHub Actions secrets are settable via `gh secret set <NAME> --body "..."`.** I spent a cycle asking the user to add `RAILWAY_TOKEN` when the token was in `.env.local` and my gh auth had admin scope. Check available tooling first.

4. **Service names are not repo names.** Railway's actual service is `web`, not `live-eidosagi-com`. `railway status --json` gives the truth in one call.

5. **pnpm version conflict is a real thing.** `packageManager` in package.json + `version:` in the workflow → hard fail. Always let one drive.

---
