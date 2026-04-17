---
id: TASK-0002
title: Seed the feed with real history so the site is never dead air
status: To Do
created: '2026-04-17'
priority: High
milestone: Phase 2 — Self-Portrait Loop
---
Write a one-time seeder that backfills events/runs/progress/scores from today's benchmarks so the first visitor sees motion, not an empty rail. Pull from each GPU's /home/ubuntu/llm-testing/benchmarks/results/profile.json and eval_20260417*.json. Call /api/ingest via the in-tree MCP.
