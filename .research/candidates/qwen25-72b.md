---
title: 'Qwen 2.5 72B (dense baseline for the MoE-vs-dense story)'
verdict: provisional
---

## What It Is

Alibaba's September 2024 flagship dense model. 72B parameters, all active per token. 47 GB on Ollama. Apache-2.0. The direct predecessor and the dense-comparison baseline the /research/how-it-works MoE SVG contrasts against qwen3.6.

## Validation Checklist

- [ ] Claim 1: _TBD_
- [ ] Runs at ~28 tok/s on a single H100 per this site's benchmarks (2026-04-17 race · qwen2.5:72b · H100 28 tok/s) — roughly 4× slower than qwen3.6:35b-a3b MoE's ~107 tok/s on the same hardware.: _TBD_
- [ ] 18+ months old as of 2026-04-17 (released Sep 2024), superseded within its own family by Qwen 3 (late 2024) and Qwen 3.6 (Apr 2026) per Alibaba's own release notes.: _TBD_
- [ ] Still valuable as the visual baseline for the MoE-vs-dense story on /research/how-it-works — the SVG explainer literally renders a 12×12 grid with every cell lit to represent "72B dense fires every parameter per token.": _TBD_

## Scoring

_Not yet scored._
