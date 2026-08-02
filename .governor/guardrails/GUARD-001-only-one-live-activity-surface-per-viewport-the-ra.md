---
id: "GUARD-001"
type: "guardrail"
title: "Only one live activity surface per viewport \u2014 the rail, not an inline copy"
status: "active"
date: "2026-04-17"
---

The ActivitySidebar is the canonical live feed on desktop. Do NOT duplicate the feed inline on /, /runs, or any page. The full /activity page is kept only for mobile + deep-dive + permalinks — not as a second live surface. Violating this creates visual redundancy, doubles polling cost, and teaches visitors the wrong information hierarchy.
