---
title: 'Qwen 3.6 35B-A3B (sparse MoE, incumbent harness default)'
verdict: provisional
---

## What It Is

Alibaba's April 2026 release. Mixture-of-experts with ~3B active parameters per token out of 35B total. On-disk 23 GB via Ollama. Apache-2.0 licensed. Incumbent harness default since PR #58 (2026-04-17), chose over qwen2.5:72b after release the same day.

## Validation Checklist

- [ ] Claim 1: _TBD_
- [ ] Runs at ≥ 100 tok/s on a single NVIDIA H100 80 GB via Ollama 0.21.0 with OLLAMA_CONTEXT_LENGTH=8192, verified by this site's benchmark table (H100 raced qwen3.6:35b-a3b at 107 tok/s on 2026-04-17).: _TBD_
- [ ] Fits within a single H100 80 GB's VRAM with the harness's current 1500-token completion cap — the harness has run ~20 agent turns without OOM on 2026-04-17.: _TBD_
- [ ] Supports OpenAI-compatible tool_calls / function-calling via Ollama's /v1/chat/completions endpoint — verified by `scripts/qwen-harness.py` executing write_file, run_command, log_event, emit_paragraph, and done tool calls end-to-end on 2026-04-17 (ADR-005 steps 5 + 6 closed).: _TBD_
- [ ] Apache-2.0 license means the harness can author content that's shipped to a public production site (live.eidosagi.com) with no MAU gate, prohibited-uses clause, or Meta-style notification requirement.: _TBD_

## Scoring

_Not yet scored._
