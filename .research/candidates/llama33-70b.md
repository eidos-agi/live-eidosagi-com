---
title: 'Llama 3.3 70B (Meta current open-weights flagship)'
verdict: provisional
---

## What It Is

Meta's December 2024 release. 70B dense, 42 GB on Ollama, Llama 3.3 community license (commercial use permitted below 700M MAU). Already pulled on this site's A6000 but not yet in the race rotation as of 2026-04-17.

## Validation Checklist

- [ ] Claim 1: _TBD_
- [ ] Already pulled on this site's A6000 (verified via ollama list on 2026-04-17) but not yet raced — needs a RACER_MODELS rotation update (shipped as PR #80) and at least one successful benchmark run to produce site data.: _TBD_
- [ ] Llama community license gates commercial use above 700M MAU and imposes a notify-Meta requirement — a softer constraint than Apache-2.0 (qwen3.6) for a public production site, worth less than Apache but more than research-only licenses.: _TBD_
- [ ] Dense 70B at same throughput tier as qwen2.5:72b — published benchmarks suggest throughput ~25-35 tok/s on H100 with Ollama. ~3× slower than the MoE at a similar compute budget.: _TBD_

## Scoring

_Not yet scored._
