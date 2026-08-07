---
title: DeepSeek V3 (reasoning specialist)
verdict: provisional
---

## What It Is

DeepSeek's December 2024 release. 671B-parameter MoE with 37B active per token. Best-in-class on public reasoning benchmarks (MMLU, GPQA, MATH) for open-weights models as of late 2024 / early 2025. MIT / DeepSeek license. Substantial memory footprint; typically pulled only when a host has 600+ GB aggregated VRAM — not a fit for this site's current H100 single-card setup.

## Validation Checklist

- [ ] Claim 1: _TBD_
- [ ] 671B total / 37B active is roughly 13× the active-parameter budget of qwen3.6:35b-a3b. The memory footprint does not fit on a single H100 80 GB; requires multi-GPU sharding or a dedicated 8xA100/H100 host. Incompatible with this site's current Thunder single-card setup.: _TBD_
- [ ] Best-in-class on public reasoning benchmarks (MMLU, GPQA-Diamond, MATH) for open-weights models as of early 2025 — but the reasoning-quality advantage would be eclipsed by the infrastructure cost of running a 37B-active MoE per turn vs qwen3.6's 3B-active.: _TBD_

## Scoring

_Not yet scored._
