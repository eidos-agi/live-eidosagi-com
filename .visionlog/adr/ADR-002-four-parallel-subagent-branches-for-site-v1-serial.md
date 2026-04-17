---
id: "ADR-002"
type: "decision"
title: "Four parallel subagent branches for site v1 \u2014 serialized merge"
status: "accepted"
date: "2026-04-17"
---

To build the site v1 fast without merge-conflict churn, split the work into four non-overlapping branches (files-by-owner partition), each on its own subagent:

1. `feat/sqlite-volume-and-webhooks` — DB layer + webhook
2. `feat/brand-and-content` — metadata, /about, /methodology, /models, raw-data, OG/favicons
3. `feat/live-widgets-and-share` — Hero, status strip, commentator, share, schedule, narrative, embed.js
4. `feat/chat-and-links` — chat sidebar + links footer

Each subagent briefed with explicit "do NOT touch" lists. Merge order: SQLite first (DB layer everything else reads from), then brand (no runtime deps), then widgets (reads aggregated data), then chat (additive migration).

**Tradeoff accepted**: some integration friction post-merge when hero needs data shaped by SQLite branch. Expect a tidying pass after the four merges.
