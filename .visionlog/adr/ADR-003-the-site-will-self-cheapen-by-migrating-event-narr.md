---
id: "ADR-003"
type: "decision"
title: "The site will self-cheapen by migrating event narration from Claude to local A6000 llama"
status: "accepted"
date: "2026-04-17"
---

**Context**: The whole product argues "local AI is cheap and ready." The most compelling way to demonstrate that is to have the site *itself* eat that dogfood — start with Claude-authored event summaries, transition to A6000-authored, show the savings live.

**Decision**: Phase 4 of the project is the self-cheapening loop. Build an Ollama-backed summarizer daemon on the A6000 (already running llama3.1:8b at 80 tok/s, already paid for at $0.35/hr). It consumes raw tool-call / git-activity / benchmark records and emits 1-2 minute cadence event summaries via /api/ingest.

**Consequences**:
- A dashboard widget showing "X% of today's events authored by local AI · $Y saved" becomes a hero metric.
- Actor-field gets a new value `local-llm` so visitors can see which events came from where.
- Claude remains the primary action-taker (planning, code, decisions) — the local LLM is the *narrator*, not the architect. This keeps quality high while maximizing the visible cheapening story.
- Incremental rollout: commit narration first (easy), then subagent summaries, then milestone framings.

**Supersedes**: the implicit assumption that Claude would always write all events. Ships with Phase 4.
