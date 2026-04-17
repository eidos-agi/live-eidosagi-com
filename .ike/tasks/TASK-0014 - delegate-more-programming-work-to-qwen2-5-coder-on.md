---
id: TASK-0014
title: Delegate more programming work to qwen2.5-coder on the A6000
status: To Do
created: '2026-04-17'
priority: Medium
milestone: Phase 4 — Self-Cheapening Loop
---
Parallel to the self-cheapening narration loop: migrate routine coding tasks to a local coder model so the site dogfoods its own thesis on the build side, not just the narration side.

**Plan**:
1. Pull `qwen2.5-coder:14b` (or 32b when RAM allows) on the A6000 Thunder instance.
2. Build a small CLI wrapper (`eidos-qwen`) that takes a prompt + optional file context and streams completions from Ollama.
3. Identify tasks where qwen is "good enough": typed-TS scaffolding, test generation, small refactors, doc rewrites, commit-message drafts.
4. Claude stays primary for architecture, decisions, reviews, tricky bugs — qwen handles the implementation hose.
5. Track savings via the same /api/savings endpoint (actor='qwen-coder') — each delegated task logs est. tokens + saved $.

**Acceptance**: at least one PR on live-eidosagi-com is authored start-to-finish by qwen-coder (with Claude as reviewer), labeled `author:qwen` in the commit trailer, and the savings widget reflects the delegation.

**Related**: ADR-003 (self-cheapening), GOAL-001 (Phase 4).
