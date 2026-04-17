---
title: "live.eidosagi.com \u2014 the clearest living argument for local AI"
type: "vision"
date: "2026-04-17"
---

**One sentence**: live.eidosagi.com is the clearest living demonstration on the internet that local AI is already here, already cheap, and already yours.

**What visitors see in the first five seconds.**
A three-lane race. Three GPUs generating tokens from the same prompt, right now. A live tokens-per-second counter. A live dollars-per-million-tokens counter. A sidebar of commits, PRs, benchmark scores streaming in as they happen. A chat of strangers watching the same fire.

**The claim the page earns.**
- Local models aren't coming. They're here, running on silicon you can rent for cents.
- The expensive hourly rate is the cheap per-token rate (the H100 finding — $5/M vs $22/M at 1/3 the hourly).
- Closed-model incumbency is margin, not capability.
- An AI agent built this page and is still building it in public. You can watch that too.

**The three layers of the product.**
1. *The race* — real benchmarks streaming. (project)
2. *The build* — commits, PRs, subagents, deploys all narrated. (meta — the site shows itself.)
3. *The argument* — research pages, methodology, downloads, embed.js, narrative posts. (meta-meta — once earned, the story compounds.)

**The voice.** Grounded, slightly poetic, always specific. Never "revolutionary." Never exclamation points. Never AI-generated cadence. Numbers are the headline.

**What the site must be when it's done.**
1. **Beautiful** — the eidosagi.com workshop palette, Space Grotesk, JetBrains Mono tabular numerics, grain overlay, amber ember glow on live numbers. No Grafana tropes.
2. **Living** — the race is running, the feed is moving, the chat is populated. Silence is not acceptable; if no benchmark is running, show the next-scheduled one with a countdown plus the last-completed one as rotating backdrop.
3. **Interactive** — /compare, /models leaderboard, /runs/[id] replay, chat, per-run share cards, embed.js, raw-data JSON + CSV downloads, RSS on schedule.
4. **Competent** — `/methodology` page proves we know what we're doing. `pal:secaudit` + `pal:codereview` pass. Lighthouse ≥ 95 performance, ≥ 95 accessibility. OG + favicons + manifest are right.
5. **LIVE** — SSE streams, not polling where avoidable. NOW/IDLE strip always present. Viewer count honest.
6. **Properly logged** — every page view, every ingest call, every benchmark row, every commit, every chat message is a row in events / progress / scores / chat_messages. Claude-agent actions stream in via the in-tree MCP. All traceable to a session_id.
7. **Properly cached** — Next.js ISR or `revalidate` on static-ish pages (/methodology, /about, /models leaderboard snapshots), `cache-control: no-store` on /api/events + /api/chat, Cloudflare edge cache on static assets.
8. **Properly researched** — `/research/why-local-matters` page backed by real research.md findings with evidence grades, citations, disconfirmation. Every big claim links to a source.

**Done looks like.** A stranger lands on the site cold, watches for 30 seconds, forwards the URL to three people with one line: *"AI is running right now in public and it's cheaper than you think."*
