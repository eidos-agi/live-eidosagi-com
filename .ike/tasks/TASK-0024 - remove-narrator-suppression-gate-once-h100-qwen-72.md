---
id: TASK-0024
title: Remove narrator suppression gate once H100 Qwen-72B harness is live
status: To Do
created: '2026-04-17'
priority: Normal
blocked_reason: Waits on TASK-0019 (autonomous harness migration)
---
/api/ingest now suppresses actor='eidos-local' non-milestone events as of PR #54. Reason: the A6000 llama3.1:8b narrator was producing LinkedIn-cadence hallucinations, markdown detritus, and duplicate headlines. It was making the case against the pitch.

When ADR-005 ships (TASK-0019 — Qwen 2.5 72B on H100 with Claude Agent SDK pointed at the local endpoint), we should:
  1. Verify the local harness's own narrations pass a minimal quality bar (no hallucinated numbers, no unparsed markdown, no duplicates).
  2. Flip the gate: either remove the suppression entirely, OR keep it and route 'eidos-local' narration through the local harness so only the new, better narrator's events land.
  3. Update /research/migration-plan to note the gate came off and the savings counter is authentic again.

Until then, the suppressed events still count in by_actor — /api/savings remains honest about local_share even while the narrator is silent.
