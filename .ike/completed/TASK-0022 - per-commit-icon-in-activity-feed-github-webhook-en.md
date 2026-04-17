---
id: TASK-0022
title: Per-commit icon in activity feed (GitHub webhook enrichment)
status: Done
created: '2026-04-17'
priority: Normal
updated: '2026-04-17'
blocked_reason: 'Webhook code is complete: /api/github-webhook writes icon=''git-branch''
  for commits and icon=''git-pull-request'' for PRs. ActivitySidebar''s iconGlyph()
  already has ⑂, ⇅, ● mappings. Blocker is upstream — human_task #2 (install the webhook
  on eidos-agi/live-eidosagi-com with the correct secret) has not been resolved by
  the human yet. Once the webhook is live, commit icons appear automatically.'
---
Each GitHub commit event in the feed should render with a small identifying icon — branch for commits, pull-request for PRs, merge-commit for merges. Webhook payload already carries the commit type; ActivitySidebar's iconGlyph() already has 'git-branch' / 'git-pull-request' / 'git-commit' cases. Need to verify:
1. GitHub webhook is actually installed on eidos-agi/live-eidosagi-com (human_task #2 from earlier audit).
2. /api/github-webhook maps commit -> icon='git-commit', pr.opened -> 'git-pull-request', pr.merged -> 'git-branch'.
3. repo_activity rows get the icon column populated.
4. ActivitySidebar renders the glyph visibly (currently only shows them for eidos-local narration events — check fallback path).
