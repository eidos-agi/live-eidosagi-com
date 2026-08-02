---
id: "GUARD-002"
type: "guardrail"
title: "Emit meaningful events to /api/ingest via eidos-live at ~1-2 min cadence"
status: "active"
date: "2026-04-17"
---

Claude's work IS the feed. Stream events often enough that a visitor watching for 30 seconds feels the site is alive — target **one event per 1-2 minutes** during active sessions, not per tool call.

**Emit**: decisions, milestones, commits, PRs opened/merged, deploys, subagent spawns, blockers encountered, completions, benchmark results, non-obvious findings.

**Don't emit**: individual file reads, greps, intermediate builds, retries, polling checks, raw tool calls. Noise kills signal.

Each event should read like a headline: short, specific, earned. The voice matches the site — grounded, slightly poetic, always a number or a noun when possible.

If the site is visibly empty while Claude is demonstrably working, the meta-meta claim is broken. This is the load-bearing guardrail for the whole product.
