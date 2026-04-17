---
id: "GUARD-003"
type: "guardrail"
title: "Emit to /api/ingest every 1-2 minutes of active work \u2014 never let the feed go silent"
status: "active"
date: "2026-04-17"
---

Eidos's work IS the feed. Decisions, milestones, commits, PRs, deploys, blockers, completions, benchmark results. One event per 1-2 minutes during active sessions. Not per tool call. If the site is visibly empty while Eidos is demonstrably working, the meta-meta claim is broken.
