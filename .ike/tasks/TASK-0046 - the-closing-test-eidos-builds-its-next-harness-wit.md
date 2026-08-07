---
id: TASK-0046
title: 'THE closing test — Eidos builds its next harness without Claude (GOAL-002 capstone)'
status: To Do
created: '2026-04-17'
priority: Normal
---

This is the endpoint of GOAL-002 and the real one. Everything else in the sequence (0042 move to EPYC, 0043 bridge to H100, 0044 doc retrieval, 0045 rehearsal harness) is scaffolding for this test.

**The test:** Eidos, running continuously on the EPYC, bridged to the H100, using the rehearsal multi-agent harness, with full retrieval access to visionlog + research + ike + MEMORY — authors and ships the **next iteration of `scripts/qwen-harness.py` itself.** End-to-end. No Claude in the critical path of the diff. Claude reviews the PR; Claude does not write it.

**Why this is the endpoint:**
- Every prior ADR-005 milestone was "Qwen writes *content*" — a research page, a progress log paragraph. Those are texts.
- This is "Qwen writes the *tool that writes the tools*." A different order of self-reference.
- Once this closes, the system is genuinely self-improving in a bounded sense: every subsequent harness rev can be authored by the previous harness rev, with humans reviewing.

**The PR Eidos authors must:**
- Add at least one concretely-useful feature (candidate: a `retrieve(query)` tool wiring to TASK-0044's index; or a `plan(goal)` tool that reads an ike task and produces a dialogue-starter for the rehearsal harness).
- Update tests / smoke checks.
- Pass `pnpm build` and a small integration run on the test host.
- Leave the old harness bootable as a fallback — no bricking of the one system we have.

**How to know if it "counts":** the commit message `Co-Authored-By:` line must include `Eidos (local · <model-tag> on H100)` and NOT include `Claude …` for the critical-path commits. Claude can appear on the final human-review-pass amend, not on the authorship of the substantive change.

**Non-blockers, do not over-design:** this task doesn't need scoring of quality, benchmarking of the new harness, or formal peer review. Those can come in a GOAL-003 once GOAL-002 closes. Just: did Eidos write and ship its own next harness? Yes or no.

**Depends on:** TASK-0042, 0043, 0044, 0045 all shipped.
