---
id: '0001'
title: 'H100 is 4× cheaper per token than prototyping-tier A100/A6000 on Thunder Compute'
status: open
evidence: UNVERIFIED
sources:
- text: 'Internal benchmark 2026-04-17 captured in cockpit-eidos/briefs/2026-04-17-gpu-battery-and-live-eidosagi.md.
    Ollama 0.21.0, OLLAMA_CONTEXT_LENGTH=8192, q4 KV cache, flash-attn. llama3.1:8b
    Q4_K_M. Measured tok/s: H100=126.6, A100=8.1, A6000=4.3 (under shared virtualized
    load).'
  tier: SECONDARY
created: '2026-04-17'
---

## Claim

Running identical llama3.1:8b inference against Thunder Compute's three tiers, the most expensive hourly rate (H100 production at $2.49/hr) is the cheapest per token — $5.46/M tokens — because it is ~15× faster than the prototyping tiers. A6000 prototyping ($0.35/hr) costs $22.59/M tokens during the same benchmark; A100 prototyping ($0.78/hr) costs $26.75/M tokens.</claim>
<parameter name="evidence">REASONED

## Supporting Evidence

> **Source [SECONDARY]:** Internal benchmark 2026-04-17 captured in cockpit-eidos/briefs/2026-04-17-gpu-battery-and-live-eidosagi.md. Ollama 0.21.0, OLLAMA_CONTEXT_LENGTH=8192, q4 KV cache, flash-attn. llama3.1:8b Q4_K_M. Measured tok/s: H100=126.6, A100=8.1, A6000=4.3 (under shared virtualized load)., retrieved 2026-04-17

## Caveats

None identified yet.
