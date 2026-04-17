---
id: TASK-0031
title: 'truly-offline story — prove the site works when the GPUs are cut off from the internet'
status: To Do
created: '2026-04-17'
priority: Normal
---

User nudge (2026-04-17): "don't forget to get to offline models."

The story right now says "running locally on the H100 via Thunder Compute." Thunder is a cloud — strictly, these GPUs have internet. True offline is two demonstrations we haven't done:

1. **Air-gapped inference demo** — pull the weights once (done), then cut the GPU's outbound internet (`iptables -j DROP` everything except the SSH back-channel), run a benchmark. Screenshot / record the run to prove tokens keep flowing with zero upstream calls. Add a short section to `/research/how-it-works` or a new `/research/offline-demo` page with the evidence.

2. **Local-first architecture on the site copy** — the story currently emphasizes cost. The sovereignty/privacy story is under-sold. Specifically call out: weights on disk, prompts never leave your network, works on a plane / in a SCIF / behind a corporate proxy. Matters for regulated industries (healthcare, defense, finance).

Also: the three-reasons card on `/research/how-it-works` covers "inference is yours" as a paragraph. Upgrade it with a visual — a "packets leaving your laptop" animation with vs without local.

Acceptance: a visitor can point to concrete evidence the stack runs with zero upstream calls + the sovereignty story is visible (not buried) in the site's main narrative pages.
