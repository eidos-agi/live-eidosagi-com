---
id: TASK-0020
title: Model mix-up — qwen3, gemma4, deepseek-v3 benchmark + candidate rotation on
  live-racer
status: To Do
created: '2026-04-17'
priority: High
---
Vybhav's ask. Live-racer only uses llama3.1:8b today. Add a rotation that cycles through: qwen2.5:14b, qwen3:30b (MoE), gemma3:27b, gemma4:*, deepseek-r1:14b, mistral/codestral. Each race emits actor='benchmark' with model in the event detail so the activity feed can narrate 'Qwen 3 30B lit up on the H100 at X tok/s'.

Also: publish a single-page table at /models showing each open-weights model × each GPU × tok/s × $/M tokens (already exists, just backfill the new models into it).

Dependency: TASK-0017 migration plan (so the models are available post-migration).
