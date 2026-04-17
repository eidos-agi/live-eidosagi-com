---
id: "ADR-004"
type: "decision"
title: "Mid-event pivot \u2014 migrate the agent harness itself off Anthropic"
status: "accepted"
date: "2026-04-17"
---

**Context (2026-04-17 live event).** Eidos is burning Claude tokens faster than the A6000 narrator can displace them. The homepage mission bar was measuring narration only — coupling #1 (weights). Coupling #2 (harness) was load-bearing and unstated.

**Decision.** Bring up Qwen 2.5 72B on the H100 we're already renting ($2.49/hr). Run Claude Agent SDK or equivalent against the local Ollama OpenAI-compatible endpoint. Expand the mission bar definition from "% of events narrated locally" to "% of AGENT work running locally."

**Shortlist (open-weights, 70B-class)**: Qwen 2.5 72B (default), DeepSeek V3 (MoE upside), Llama 3.3 70B (conservative). Vybhav's Qwen 3 + Gemma 4 ask goes on the model-mix-up work list; they post-date our harness and need a clean eval pass first.

**Accepted losses**: frontier reasoning ceiling on hard tasks, Claude Code's UX polish, hosted elasticity. **Kept**: SQLite store, eidos-live MCP, live-racer, A6000 narrator, dashboard surfaces. The plumbing is ours already.

**Public face**: /research/migration-plan, nav link in danger-red. Page ends: "If this page was written by Claude, we're still on Anthropic. If actor='eidos-local' on the publish event, we made the jump." The site becomes the proof.
