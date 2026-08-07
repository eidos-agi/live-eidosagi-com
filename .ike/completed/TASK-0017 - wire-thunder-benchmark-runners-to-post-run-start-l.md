---
id: TASK-0017
title: Wire Thunder benchmark runners to POST run_start / log_progress / log_score
status: Done
created: '2026-04-17'
priority: High
updated: '2026-04-17'
---
Audit at 18:03 showed `/api/raw/runs` returns an empty list — the original `run_full_suite.py` benchmark orchestrator (running on A6000/A100/H100 in `/home/ubuntu/llm-testing/`) never POSTs anything to /api/ingest. The RaceBoard therefore can't show a live run; it falls back to the default lane config.

Ship a small wrapper that the orchestrator can call to:
1. `run_start` at phase boundary — include gpus + models arrays
2. `log_progress` during benchmark_runner phase — tokens/sec samples per (gpuId, model, useCase)
3. `log_score` when eval completes — composite + dimensions per (useCase, testCaseId)
4. `run_end` on suite completion

Can reuse the existing Python stdlib HTTP pattern from `scripts/a6000-narrator.py`. Maybe drop a `scripts/ingest_from_run.py` that tails `benchmarks/results/run_log.json` + `eval/results/eval_*.json` and POSTs new rows.

**Acceptance**: kick a new `python3 run_full_suite.py --budget 600 --skip-pulls --levels 1,2` on any of the 3 instances → within 30s the RaceBoard shows a live lane with that GPU authoring progress rows, and /api/raw/runs returns a row.
