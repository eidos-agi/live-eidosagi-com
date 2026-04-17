---
id: "GOAL-002"
type: "goal"
title: "Eidos continuous — multi-agent on EPYC bridged to H100, rehearsing with its own docs, building its next harness without Claude"
status: "open"
date: "2026-04-17"
depends_on: ["GOAL-001"]
unlocks: []
---

**The long-term claim:** Eidos runs continuously on hardware we own (the HOSTKEY EPYC bare-metal, 384 GB RAM, $299/mo), bridges out to the best available inference silicon (Thunder H100 today, on-prem cards later), and improves itself through multi-agent dialogue with its own docs. The final test: can Eidos build its *next* harness iteration — the one that replaces `scripts/qwen-harness.py` — using only offline models?

**Why this is the real vision, beyond the live event:**
- GOAL-001 ("self-cheapening loop") proves local AI can write the narration.
- GOAL-002 proves local AI can *build the thing that writes the narration.*
- The live event is a demo; this is what makes it a platform.

**The four pieces:**

1. **Continuous host** — move every long-running process off Daniel's laptop onto the EPYC (`epyc-56223.eidosagi.com`, 162.120.18.7). That's `live-racer`, any scheduled qwen-harness runs, eidos-mail, Omni adapters, the event narrator when it comes back. Laptop-sleep should never equal site-goes-dark.

2. **EPYC ↔ H100 bridge** — a durable RPC channel so agent workloads on the EPYC can call Ollama on the H100 without SSH-per-call overhead. Options: persistent SSH tunnel + loopback Ollama, WireGuard VPN, or Cloudflare Tunnel. Whichever gives sub-100 ms RTT and survives laptop reboots.

3. **REHA-style multi-agent chat** (rehearsal-style — user term, clarify if framework-specific) — generalize the current single-caller `qwen-harness.py` to N agents with distinct roles (planner / coder / reviewer / committer), taking turns in a conversation. Each agent's output is an input to the next; decisions emerge from dialogue, not single-shot prompts. The conversation itself is a first-class artifact (like a PR's review thread).

4. **Docs as agent tools** — expose `.visionlog/*`, `.research/*`, `.ike/tasks/*`, `MEMORY.md`, prior PRs, and the event feed as retrievable context to every agent. An agent asking "what does the vision say about caching?" should get the actual sentence, not a hallucination. Probably means a small local vector index + a `retrieve(query)` tool.

**The closing test:**
Eidos, running on the EPYC, using the H100 (or local on-prem when we get there), with the multi-agent harness, with the doc retrieval tools — authors and ships the next iteration of `scripts/qwen-harness.py` itself. That PR, end-to-end, without Claude in the critical path, is the end of Phase 4 and the start of Phase 5.

**Why it's achievable:**
- EPYC exists and is paid ($299/mo, 384 GB RAM headroom).
- H100 is up and addressable.
- Qwen 3.6 35B-A3B on H100 already runs a working tool-using loop end-to-end (ADR-005 closed this afternoon).
- The doc corpus is small enough (~10 MB of markdown) for a trivial embedded index.
- The multi-agent rehearsal pattern is well-explored territory (Debate, Constitutional AI, Voyager-style).

**Dependencies:**
- GOAL-001 closed (self-cheapening narrator loop).
- A working EPYC ↔ H100 bridge (blocks the multi-agent work).
- Token accounting (TASK-0041) so we can prove the delegation actually works in numbers.

**First tasks filed:** TASK-0042 through TASK-0046 (see `.ike/tasks/`).
