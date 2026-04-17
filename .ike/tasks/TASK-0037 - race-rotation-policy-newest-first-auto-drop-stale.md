---
id: TASK-0037
title: 'race rotation policy — newest-first, auto-drop stale tags, per-GPU allowlist'
status: To Do
created: '2026-04-17'
priority: Normal
---

Two failure modes surfaced during audits:
1. `qwen2.5:32b` / `qwen3:30b` / `llama3.3:70b` in RACER_MODELS but not pulled → race aborts "all lanes failed"
2. A6000 OOMs on models it's listed as having but can't actually load into VRAM

Fix both with a data-driven rotation:

**Source of truth = models table.** live-racer.py queries `/api/models/catalog?filter=in_race_rotation=1` at startup, not a hardcoded env var. New rows auto-join; toggling `in_race_rotation=0` removes a model without a redeploy.

**Per-GPU allowlist.** Add `race_gpus` TEXT column to `models` — comma list of GPU types that should attempt this model. Default rule: `qwen*:{1.5b,3b,7b,8b} → A6000,A100,H100`, `*:14b → A100,H100`, `*:32b+ → H100`. Pre-race, live-racer already calls `has_model` per GPU; extend to also check `race_gpus`.

**Sort newest-first.** Sort by `released_at DESC` before cycling so the pit-wall has fresh models showing up in rotation.

Acceptance: zero "race aborted — all lanes failed" events for 24 h after shipping; at least one race per cycle uses a model released in the last 30 days.
