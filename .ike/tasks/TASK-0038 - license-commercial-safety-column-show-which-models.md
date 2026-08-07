---
id: TASK-0038
title: 'license / commercial-safety column — show which models are OK to ship in a product'
status: To Do
created: '2026-04-17'
priority: Normal
---

The `models` table already has a `license` column. Surface it with a commercial-safety judgment so a visitor evaluating "can I use this in my SaaS?" gets an answer in one glance.

Add to the registry and both /models pages:

- **commercial_use**: "yes" | "yes-with-restrictions" | "no" | "research-only"
- **notes_commercial**: short plain-English gotcha (e.g. "Llama 3.x license: free below 700M monthly active users — notify Meta above that threshold.")

Mapping for the current lineup:
- Apache-2.0 (Qwen 2.5, 3.6) → **yes** · no attribution required beyond the license text
- Llama 3.1 / 3.2 custom license → **yes-with-restrictions** · 700M-MAU gate
- Gemma custom license → **yes-with-restrictions** · prohibited-uses clause
- DeepSeek MIT / Apache → **yes**

UI: a tiny green/yellow/red pill on each model card, tooltip shows the notes_commercial string. No full legal text — link out for that.

Acceptance: /models page shows commercial-safety pill per card; visitor can filter leaderboard to "commercial-safe only"; every row in `models` table has non-null commercial_use.
