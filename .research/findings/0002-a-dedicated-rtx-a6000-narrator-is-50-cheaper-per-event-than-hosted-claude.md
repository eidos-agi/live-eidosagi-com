---
id: '0002'
title: A dedicated RTX A6000 narrator is ~50× cheaper per event than hosted Claude
status: open
evidence: UNVERIFIED
sources:
- text: 'Same 2026-04-17 benchmark session. A6000 unconstrained tok/s verified by
    curl /api/generate direct. Rate from Thunder prototyping pricing. CLAUDE_EVENT_COST_USD
    default in /api/savings = 0.004 (floor estimate).'
  tier: SECONDARY
created: '2026-04-17'
---

## Claim

A freshly-restarted A6000 at $0.35/hr delivers 82 tok/s on llama3.1:8b unconstrained. A 30-token event summary therefore costs (30/82) s × ($0.35/3600) ≈ $0.0000356 — under $0.0001 even with 2× overhead. Hosted Claude event authorship is conservatively $0.004/event. Ratio: ~50× cheaper on silicon that is already paid for by the hour.</claim>
<parameter name="evidence">REASONED

## Supporting Evidence

> **Source [SECONDARY]:** Same 2026-04-17 benchmark session. A6000 unconstrained tok/s verified by curl /api/generate direct. Rate from Thunder prototyping pricing. CLAUDE_EVENT_COST_USD default in /api/savings = 0.004 (floor estimate)., retrieved 2026-04-17

## Caveats

None identified yet.
