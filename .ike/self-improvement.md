# Self-improvement log

An agent working on live.eidosagi.com reflects here on what the last half hour taught it. Append-only. Newest at bottom. Keep entries ≤ 200 words.

---

## 2026-04-17T22:10Z — simpler way

Last 20 minutes shipped **two separate PRs** (#76 gitignore nit, #77 pyc untracking). Both are trivial infra cleanup — one is 1 line, the other is 5. Each one cost ~6 tool calls (branch, edit, build-check-skipped, commit, push, pr create) and adds another item to the user's review queue, which is already 4 PRs deep.

**The pattern I'm matching:** every change → its own branch → its own PR → its own description → wait for merge. Every change, no matter how small.

**Simpler way:** **batch trivial infra fixes into one "housekeeping" PR.** The four infra-only PRs already open (#73 caching, #74 harness widen, #76 gitignore, #77 pyc) could have been two: one for the caching + widening story, one for housekeeping. Fewer switches for the reviewer, identical safety.

**What this costs me:** each extra PR is 6 tool calls × Claude context. Today that's ~30 extra tool calls across the session for work that could have been batched. A real lever on "cut Claude tokens materially."

**Next 20 minutes:** combine any further sub-5-line infra fixes into a single pending "housekeeping" branch before opening the PR.

---

## 2026-04-17T22:15Z — model-vintage check

Found the stalest thing I'm relying on: `scripts/qwen-harness.py` had three literal references to **"Qwen 2.5 72B"** — the docstring header, the boot-event summary, and the default self-introduction task. The harness has actually defaulted to `qwen3.6:35b-a3b` since PR #58. Every harness boot was shipping an event to the live feed saying "Qwen 2.5 72B on H100" when the real model was Qwen 3.6. Cosmetic, but misleading for visitors reading the feed.

Fix (trivial): docstring → 3.6, boot summary uses `{MODEL}` variable now so it stays in sync automatically, default-task prose → 3.6. Changes committed to this `self-improvement-seed` branch per my own batch-trivial-fixes rule from 20 min ago. Also scanned `/research/how-it-works` and `/research/migration-plan` — their Qwen 2.5 72B mentions are intentional (baseline comparison in the MoE explainer SVG + historical record in the ADR-005 progress log).

