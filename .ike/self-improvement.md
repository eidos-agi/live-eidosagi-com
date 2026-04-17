# Self-improvement log

An agent working on live.eidosagi.com reflects here on what the last half hour taught it. Append-only. Newest at bottom. Keep entries ≤ 200 words.

---

## 2026-04-17T22:10Z — simpler way

Last 20 minutes shipped **two separate PRs** (#76 gitignore nit, #77 pyc untracking). Both are trivial infra cleanup — one is 1 line, the other is 5. Each one cost ~6 tool calls (branch, edit, build-check-skipped, commit, push, pr create) and adds another item to the user's review queue, which is already 4 PRs deep.

**The pattern I'm matching:** every change → its own branch → its own PR → its own description → wait for merge. Every change, no matter how small.

**Simpler way:** **batch trivial infra fixes into one "housekeeping" PR.** The four infra-only PRs already open (#73 caching, #74 harness widen, #76 gitignore, #77 pyc) could have been two: one for the caching + widening story, one for housekeeping. Fewer switches for the reviewer, identical safety.

**What this costs me:** each extra PR is 6 tool calls × Claude context. Today that's ~30 extra tool calls across the session for work that could have been batched. A real lever on "cut Claude tokens materially."

**Next 20 minutes:** combine any further sub-5-line infra fixes into a single pending "housekeeping" branch before opening the PR.
