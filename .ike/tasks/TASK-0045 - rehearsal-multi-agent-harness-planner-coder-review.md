---
id: TASK-0045
title: 'rehearsal multi-agent harness — planner/coder/reviewer/committer dialogue on EPYC calling H100 (GOAL-002 piece 3)'
status: To Do
created: '2026-04-17'
priority: High
---

**User term clarification:** "REHA" in the GOAL-002 brief — read as rehearsal-style. If it's a named framework (ReAct? specific paper?), align vocabulary.

**Why:** the current `scripts/qwen-harness.py` is one agent, one role, max 8 turns, single-shot-prompt. Good for proof-of-life (ADR-005 closed with Qwen authoring pages end-to-end). Not good for anything complex — no separation of concerns, no critique step, no handoff.

**The rehearsal pattern:** N agents with distinct roles converse before any commit. Example for a "ship TASK-X" run:

1. **Planner** (qwen3.6:35b-a3b) — reads the task + retrieves relevant docs (TASK-0044's tool). Drafts a plan as structured output.
2. **Coder** (qwen3.6:35b-a3b or a coder-specialized tag if we pull one) — takes the plan, produces the diff.
3. **Reviewer** (different temperature / system prompt, same base model) — critiques the diff against guardrails + research findings + style. Can reject → Coder retries.
4. **Committer** — runs `pnpm build`, creates branch, commits, pushes, opens PR. Never merges to main.

Each turn's output is a first-class feed event (actor=eidos-local, kind=observation, session_id=rehearsal-<task-id>). A visitor watching the feed literally watches the agents think.

**Pieces:**
- `scripts/qwen-orchestrator.py` — the rehearsal runner. Config-driven (agents.yaml).
- `scripts/agents.yaml` — role definitions, system prompts per role, model overrides.
- Tool set (shared across agents): `retrieve` (TASK-0044), `write_file`, `run_command` (widened per PR #74), `log_event`, `emit_paragraph`, `done`.
- A web view at `/rehearsals/[session]` showing the dialogue as a threaded conversation (like a PR review), not just a flat feed.

**Depends on:**
- TASK-0042 (runs on the EPYC, not laptop)
- TASK-0043 (low-latency bridge to H100 or per-turn latency kills the dialogue)
- TASK-0044 (retrieval is the thing that makes agents credible)
- PR #74 harness-widen (merged or an equivalent) so the committer can actually commit + push

**Acceptance:** one successful rehearsal run picks up a small ike task (e.g. TASK-0034 Dockerfile), dialogues through plan → code → review → commit → PR, and the PR passes `pnpm build` on Github Actions. Claude reviews the PR; Claude does not write it.
