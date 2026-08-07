---
id: TASK-0044
title: 'docs as agent tools — embed index over .visionlog / .research / .ike / MEMORY.md so agents can retrieve real sentences (GOAL-002 piece 4)'
status: To Do
created: '2026-04-17'
priority: High
---

**Why:** the multi-agent harness (TASK-0045) will only be credible if every agent can ask "what does the vision say about caching?" and get the actual sentence from `.visionlog/vision.md` — not a hallucination of what the vision probably says.

**Corpus:**
- `.visionlog/**/*.md` (vision + goals + guardrails + SOPs + ADRs)
- `.research/**/*.md` (once research.md projects exist)
- `.ike/tasks/*.md` + `.ike/completed/*.md` + `.ike/delegation-plan.md` + `.ike/loops.md` + `.ike/self-improvement.md`
- `MEMORY.md` + every `feedback_*.md`/`project_*.md` file in the auto-memory dir
- This repo's `README.md` + `CLAUDE.md`
- Optional: the events table (last 7 days) so agents can cite "on 2026-04-17 we decided X because Y"

**Stack (keep boring):**
- Embeddings: a local Qwen-3-embedding model on the H100 (or an openai-compat endpoint the tunnel exposes), one-shot embed at indexing time.
- Store: `sqlite-vss` extension on the existing SQLite file on the EPYC. No new database.
- Indexer: a Python script (`scripts/index-docs.py`) that walks the corpus, chunks by section header + paragraph, embeds, upserts. Runs as a systemd timer every hour, or on file-change via `inotifywait`.
- Retrieval: a `retrieve(query, k=6)` tool exposed to the multi-agent harness. Returns chunks with their source path + line range so agents can cite.

**Acceptance:**
- `retrieve("what's the vision on properly cached?")` returns the 8-line bullet from `.visionlog/vision.md` with `source=".visionlog/vision.md#must-be-when-done-properly-cached"`.
- Indexing a fresh clone takes < 2 minutes.
- The index updates within 60 s of a file change on the EPYC.
