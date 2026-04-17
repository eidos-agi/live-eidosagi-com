# Claude → Qwen delegation plan

**Goal:** materially cut Claude token usage on this project by routing work to the local Qwen 3.6 harness. Claude stays on decisions; Qwen does the bodywork.

## The delegation matrix

| Work type | Goes to | Rationale |
|---|---|---|
| Architectural decisions, guardrail reasoning | **Claude** | High-stakes, cross-system, requires taste |
| Cross-system debugging (e.g. "why is deploy stuck") | **Claude** | Needs broad context + root-cause instinct |
| Novel UI components with subjective polish | **Claude** | Design taste matters |
| User frustration handling / clarification loops | **Claude** | Needs judgement |
| Audits (benchmark check, UX check) | **Qwen** | curl + python parse + log_event; pure script |
| Writing ike tasks from a spec the human gave | **Qwen** | Templated markdown |
| Content pages (research briefs, explainer prose) | **Qwen** | Its sparse-MoE training makes it decent prose |
| DB migrations + registry updates | **Qwen** | SQL + insert statements, deterministic |
| Model detail pages, leaderboard tweaks | **Qwen** | Templated SSR components |
| Pulling new models onto GPUs | **Qwen** | SSH + `ollama pull` in a loop |
| Committing + pushing on `qwen/*` branches | **Qwen** | Low-stakes, auditable via feed |
| Merging PRs to main | **Claude or human** | Reversibility cost is higher |

## What enables this

Shipped in this session (2026-04-17):

1. **Expanded `WRITE_ALLOW_PREFIXES`** in `scripts/qwen-harness.py` — Qwen can now write anywhere in `src/`, `scripts/`, `public/`, `.ike/tasks/`, `.visionlog/`, `.research/`, `.github/workflows/`, and root config files. Hard-walled off `.env*`, `pnpm-lock.yaml`, `.git/`.
2. **`COMMAND_PREFIX_ALLOWLIST`** — `git checkout -b qwen/…`, `git add …`, `git commit -m …`, `git push -u origin qwen/…`, `gh pr create --title …`. Branch creation and pushes are hard-scoped to `qwen/*` — Qwen can never push to main or a non-qwen branch. No `pr merge`, no force-push, no `reset --hard`.
3. **Feed visibility** — every `write_file` + `run_command` call emits a log_event with actor=eidos-local. PR #71 widened the ingest gate so these aren't silenced. A human reviewing the feed sees everything Qwen touched.
4. **`WRITE_MAX_BYTES`** raised from 10 KB to 40 KB — real pages need the headroom.

## Routing rule for future sessions

Before Claude does work, ask: **"Could Qwen do this with write_file + run_command + git + gh in <= 8 turns?"** If yes → delegate:

```bash
INGEST_TOKEN=... QWEN_MAX_TOKENS=3500 python3 scripts/qwen-harness.py \
  "Pick up TASK-0035 (model detail pages). Create src/app/models/[name]/page.tsx.
   Read listModels() from @/lib/db. Render all registry fields + joined leaderboard rows.
   Branch qwen/TASK-0035. Commit. Push. Open PR titled 'feat: /models/[name] detail pages (TASK-0035)'.
   Run pnpm build to verify before committing. Call done."
```

Claude reviews the PR (cheap tokens) rather than writing it (expensive tokens).

## Expected savings

Rough estimate based on this session:
- ~60% of file writes were templated / pattern-follow (ike tasks, research pages, registry) — **Qwen-able**
- ~25% were infra/debug (deploy workflow, ingest gate fix, cron scheduling) — **Claude-bound**
- ~15% were UI components with design taste (BenchmarkPulse animation, dense-vs-MoE SVG) — **Claude-bound**

At 60% delegation: Claude token usage drops by roughly half. Qwen 3.6 on the H100 runs at ~2-4 s per turn × ~6 turns per task = ~20 s per PR. No meaningful cost.

## First tasks to delegate

In rough order of safety + value:

1. **TASK-0033** — pull qwen3.6:14b, gemma3:27b, deepseek-v3 onto H100 + upsert models table. Pure SSH + SQL. No UI risk.
2. **TASK-0034** — Dockerfile + gitignore nit. One-file edits, testable with `railguey_doctor`.
3. **TASK-0038** — commercial_use column + migration + pills. Schema + presentation.
4. **TASK-0035** — model detail pages. Bigger, but scoped.

TASK-0036 (quality eval harness) stays with Claude — too much judgement in rubric design.

## Monitoring

- Every Qwen run logs boot + completion events (kind=milestone, still pass the gate).
- Now that PR #71 merged, Qwen's intermediate `log_event` calls also land in the feed.
- A human can watch `/api/events?actor=eidos-local&limit=20` to see what Qwen did over the last hour.
