---
id: TASK-0036
title: 'quality eval harness — score models on reasoning, code, creative, instruction (not just tok/s)'
status: To Do
created: '2026-04-17'
priority: High
---

Current benchmarks measure tokens per second. That's necessary but a 50 tok/s model producing garbage is worse than a 5 tok/s one producing correct answers. The site claims to help visitors pick a local model — it should score quality, not just speed.

Five use-case buckets, one prompt each, judge with a rubric:

1. **reasoning** — classic "two trains" arithmetic, expect an exact number
2. **code** — "write a Python fn that X", judge on compiles + passes 2 hidden asserts
3. **instruction-following** — multi-constraint prompt, judge on strict compliance
4. **creative** — one-paragraph story prompt, 0/5 rubric (coherence, specificity, restraint)
5. **JSON extraction** — extract structured fields from a noisy paragraph, judge parse+correctness

Judge: a different local model (avoid Claude to stay on-thesis). Probably a Qwen 3.6 instance running as judge against responses from the race pool.

Store each score in the existing `scores` table with `composite = mean(dimensions)`, `dimensions = {reasoning, code, instruction, creative, json}`. The existing `/models` leaderboard `compositeScore` column already joins this, so it'll just start populating.

Acceptance: every model in the race rotation has at least one quality-dimension score; the /models page shows composite alongside tok/s; the leaderboard re-sorts when you sort by composite.
