---
id: "GUARD-007"
type: "guardrail"
title: "Blocker only a human can clear \u2192 file a human_task, not just a log_event"
status: "active"
date: "2026-04-17"
---

When the agent encounters something ONLY Daniel can do — a URL to paste, an approval to click, a password to hand over, a decision that requires his judgment, a login that needs his 2FA — use the `human_task` MCP tool (in-tree eidos-live). Do NOT just emit a log_event describing the blocker.

Rationale: log_events scroll by. Human tasks accumulate on /human-tasks until resolved. Daniel sees a single canonical queue of what the agent needs, can mark each one done, and the resolution emits its own event back into the feed. Separation of narration vs. asks.

Priorities: urgent = event-blocking (ship now or the live demo breaks); high = blocking the current iteration; normal (default) = nice-to-have for next iteration; low = opportunistic.

Always include a URL when there's one that gets the human straight to the action.
