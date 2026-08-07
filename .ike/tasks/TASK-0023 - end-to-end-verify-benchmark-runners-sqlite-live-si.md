---
id: TASK-0023
title: 'End-to-end verify: benchmark runners → SQLite → live site pulls from DB'
status: To Do
created: '2026-04-17'
priority: High
---
The live-racer is already POSTing run_start / log_progress / run_end to /api/ingest, which inserts into SQLite (runs + progress tables). The homepage, RaceBoard, RaceTimeline, HeadlineCard, DashboardGrid, /runs, /runs/[id], /models, /research/why-local-matters all read from SQLite via @/lib/db helpers.

This task is the explicit verification + documentation pass:
  1. Add an end-to-end smoke script (scripts/verify-data-flow.sh) that:
     - Counts rows in runs, progress, scores before kicking a test race.
     - Posts a run_start + log_progress + run_end via the same API used by live-racer.
     - Waits ~5s, queries /api/raw/runs and /api/raw/progress to confirm the new rows are visible to readers.
     - Posts a corresponding log_event and confirms it appears on the ActivitySidebar (via /api/events?limit=5).
  2. Document the complete data path (runner → /api/ingest → insertRun/insertProgress → SQLite → listRuns/listProgressForRun → server-rendered page) in /methodology so external contributors can add their own runners.
  3. Add an integration test that mocks the runner with a local one-off script + asserts the homepage re-renders within 2s.
Outcome: someone running `python3 scripts/verify-data-flow.sh` can prove to themselves that the pipeline is working end-to-end. Zero vendor magic.
