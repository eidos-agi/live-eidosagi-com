---
id: TASK-0028
title: 'research nav entry invisible on live site — PR #63 stacked behind deploy unblock'
status: To Do
created: '2026-04-17'
priority: High
---

User observation (2026-04-17 ~20:45 UTC): "I still see no research page at the top."

Root cause chain:
1. The `research` nav link + `/research` index page live in **PR #63** (https://github.com/eidos-agi/live-eidosagi-com/pull/63), still OPEN.
2. Even if #63 merged to main, the live site wouldn't update — Railway auto-deploy is dead (TASK-0026 / TASK-0027 / PR #66).

Unblock order:
- **TASK-0027** (most critical): add fresh `RAILWAY_TOKEN` as GitHub Actions secret so PR #66's workflow can deploy.
- **PR #66** merges (needs the secret first or will just fail on dispatch).
- **PRs #63, #64, #65** merge (can happen before #66 — they'll sit on main until a deploy fires).
- First workflow run rebuilds the site; the `research` nav entry and all of the queued changes become visible in one sweep.

Acceptance: visit live.eidosagi.com and see `research` in the top nav between `models` and `methodology`, clicking it lands on an index page with three cards (Why Local Matters, Migration Plan · ADR-005, Eidos · Local Log).
