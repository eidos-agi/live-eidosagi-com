---
id: TASK-0029
title: '/models page rebuild — DB-driven: registry joined with live throughput'
status: In Progress
created: '2026-04-17'
priority: Urgent
---

User feedback (2026-04-17): "I don't get why your models page sucks... it should be way better and db live."

Current state:
- `/models` is a client component that fetches `/api/models` (a derived leaderboard from progress+scores joins). No registry metadata. No visual hierarchy. No indication of which model is the harness default or what arch/size it is. Just a sortable table of model×gpu tok/s.
- `/models/catalog` (just shipped in PR #64) has the registry but is separate.

Rebuild plan — one unified beautiful page:
1. SSR the `models` table from DB on the server.
2. LEFT JOIN it with the leaderboard (throughput, cost/M-tokens, composite score) also from DB.
3. Cards, not a bare table: each model gets a card with name, family chip (qwen3.6 / qwen2.5 / llama3 etc), arch (dense|MoE), params/active, size on disk, release date, license, role badges (harness default, race rotation, on H100), AND the live perf if we have it (tok/s per GPU, cost/M-tokens).
4. Sort: harness default first, then newest release date, then largest. Active tags only (pulled_on_h100=1).
5. Keep `/models/catalog` as a raw-data sibling link.

Acceptance: `/models` renders a grid of model cards with registry + live perf in one view, no client-side fetch, full SSR, visual identity per family.
