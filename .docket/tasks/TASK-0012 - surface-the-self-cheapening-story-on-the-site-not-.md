---
id: TASK-0012
title: Surface the self-cheapening story ON THE SITE (not just in visionlog)
status: To Do
created: '2026-04-17'
priority: High
milestone: Phase 4 — Self-Cheapening Loop
---
The self-cheapening loop is a *visible* part of the product, not only a private internal goal.

**Deliverables**:
1. `/research/the-self-cheapening-loop` page — narrative explaining how the site plans to transition event narration from hosted Claude → local A6000 llama, with a live progress widget.
2. A live header/banner strip: "N events authored by local AI · $X saved" (wires to /api/savings — shipped with TASK-0010).
3. `/about` manifesto mentions the loop explicitly: "this site eats its own cooking — it plans to be written by the silicon it benchmarks."
4. Each local-LLM-authored event in the feed gets a visually distinct actor badge (`local-llm` → sage green dot) so visitors can see the shift happening in real time.

**Acceptance**: someone reading the site understands, within 30 seconds, that the site's own narration is migrating from hosted Claude to the A6000 — and can watch the savings accumulate.
