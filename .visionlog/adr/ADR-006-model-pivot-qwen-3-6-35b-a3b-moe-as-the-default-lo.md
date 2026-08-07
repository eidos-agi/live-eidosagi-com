---
id: "ADR-006"
type: "decision"
title: "Model pivot \u2014 Qwen 3.6 (35B-A3B MoE) as the default local harness brain"
status: "accepted"
date: "2026-04-17"
---

**Context (2026-04-17, extending ADR-004 and ADR-005).** Qwen 3.6-35B-A3B released yesterday (2026-04-16) and is purpose-built for agentic coding: "Agentic Coding: handles front-end workflows and repository-level reasoning with greater fluency and precision." MoE architecture: 35B total parameters, ~3B active per forward pass.

**Decision.** Swap the harness brain from Qwen 2.5 72B dense to Qwen 3.6 35B-A3B MoE.

**Why the swap**:
- Size: 23 GB on disk (vs 47 GB), 3B active params (vs 72B) → much faster token-gen, much more VRAM headroom on the 80 GB H100
- Tuning: purpose-built for repository-level agentic coding, which is the actual harness workload
- Reasoning preservation: new built-in thinking mode; our harness already raised max_tokens to 1500 to accommodate
- Recency: less than 24 hours old; being the first public demo of Qwen 3.6 running an agent loop IS the story

**Verified locally (2026-04-17 15:20 UTC)**:
- Pulled `qwen3.6:35b-a3b` via Ollama (23 GB, ~13s pull)
- /v1/chat/completions answered a prose question (813 completion tokens, mostly reasoning)
- /v1/chat/completions emitted valid tool_calls (finish_reason=tool_calls)
- qwen-harness.py end-to-end loop: 2 turns, 4s avg latency, clean done

**Consequences**:
- ADR-005 shortlist collapses: Qwen 3.6 supersedes Qwen 2.5 72B as default. Qwen 2.5 72B stays on disk as a fallback.
- /research/migration-plan needs a footnote update.
- Harness default changed in scripts/qwen-harness.py (QWEN_MODEL env var lets us roll back instantly).
