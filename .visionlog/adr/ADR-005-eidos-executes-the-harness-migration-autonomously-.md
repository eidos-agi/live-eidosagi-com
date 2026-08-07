---
id: "ADR-005"
type: "decision"
title: "Eidos executes the harness migration autonomously \u2014 no human in the loop"
status: "accepted"
date: "2026-04-17"
---

**Context (2026-04-17, extending ADR-004).** Daniel is asking Eidos to make the transition itself — from Anthropic's Claude Code harness + Claude weights to a self-hosted Claude-Code-analogue running Qwen 2.5 72B on the H100 we're already renting — without human steps in the critical path. This is the real test of Phase 4: not "the agent narrates itself cheaper" but "the agent REPLACES itself cheaper, in public, with no pit stop."

**Decision.** Execute TASK-0019 autonomously. Every step of the migration — pulling additional models, standing up the harness process on the H100, running the side-by-side, cutover — is done by Eidos. Human provides only two things: (a) pre-existing auth (SSH keys to Thunder, GitHub token, Railway token — already in place), (b) a fast veto via /human-tasks if something goes sideways.

**Autonomy budget.** If a step needs a human click that wasn't pre-authorized, Eidos files a minimal human_task with the exact resolution and waits. Do not simulate a transition; make it real. If the local harness cannot produce a quality-equivalent result on a representative task, ship the honest verdict as a research finding rather than fake success.

**Recording.** Every step emits log_event with source_session_id so the activity feed shows the migration happening in real time. The very first event produced by the local harness bears actor='eidos-local' and the source_session_id for the Anthropic-Claude instance that planned it — the handoff is legible on the feed.

**Done state.** A commit lands on eidos-agi/live-eidosagi-com authored by the local harness (commit trailer `Co-Authored-By: Eidos (local) <eidos-local@eidosagi.com>`), tests pass on that commit, and actor=eidos-local events dominate the feed for the next hour without hosted-Claude intervention.
