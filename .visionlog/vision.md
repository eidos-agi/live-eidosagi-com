---
title: "live.eidosagi.com \u2014 the clearest living argument for local AI"
type: "vision"
date: "2026-04-17"
---

**One sentence**: live.eidosagi.com is the clearest living demonstration on the internet that local AI is already here, already cheap, and already yours.

**The Friday 2026-04-17 live event**: Eidos is moving itself to 90%-cheaper silicon without losing intelligence, in public, with a LinkedIn audience watching at https://www.linkedin.com/feed/update/urn:li:activity:7450954697034608641/. Every minute of dead air is a bounced viewer.

**What visitors see in the first five seconds**: three-lane GPU race, live tok/s counter, live $/M-tok, SavingsStrip counting the local-AI share climbing from 0% toward 100%, ActivitySidebar streaming agent events (SSE), ChatSidebar with strangers watching the same fire.

**The three layers**:
1. *The race* — real benchmarks streaming (A6000/A100/H100). (project)
2. *The build* — commits, PRs, subagents, deploys, decisions, blockers. (meta — the site shows itself being built.)
3. *The argument* — /methodology, /about, /models, raw-data downloads, embed.js, per-run narrative posts. (meta-meta — once earned, the story compounds.)

**Phase 4 — the self-cheapening loop (Eidos solves it in-session, no playbook)**:
Migrate event narration from hosted Claude → local A6000 llama. Then delegate implementation to qwen2.5-coder on the same silicon. Claude stays the architect; the local model is the narrator and the hand. The SavingsStrip is the visible proof.

**Voice**: grounded, slightly poetic, always specific. Numbers are the headlines. No exclamation points, no emojis, no AI-cadence tells.

**Must-be-when-done**:
- Beautiful (workshop palette, Space Grotesk, JetBrains Mono, grain, ember glow, both dark and paper themes)
- Living (SSE streams, chat populated, never dead air)
- Interactive (/compare, /models, /runs/[id], share cards, embed.js, RSS)
- Competent (methodology page, pal:secaudit + pal:codereview pass, Lighthouse ≥ 95)
- LIVE (SSE not polling where avoidable; status strip always present)
- Properly logged (every action is an event row; session_id traceable)
- Properly cached (ISR on static-ish pages, no-store on APIs, Cloudflare edge for assets)
- Properly researched (/research/* pages backed by research.md findings with evidence grades + citations)

**Done looks like** a stranger who lands cold for 30 seconds forwards the URL with one line: *"AI is running right now in public and it's cheaper than you think."*
