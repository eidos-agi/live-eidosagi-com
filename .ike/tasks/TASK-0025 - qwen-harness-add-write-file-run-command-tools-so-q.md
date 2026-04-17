---
id: TASK-0025
title: 'qwen-harness: add write_file + run_command tools so Qwen can author code diffs
  end-to-end'
status: To Do
created: '2026-04-17'
priority: Urgent
---
For ADR-005 step 5 (real implementation PR authored by local harness), qwen-harness.py needs two more tools:

1. write_file(path, content) — allowlisted paths (e.g. src/app/research/**, scripts/**, .ike/tasks/**), size cap 10KB, no overwrites outside repo.

2. run_command(cmd) — allowlisted commands only (pnpm build, pnpm test, git diff, git status). Returns stdout/stderr/exit_code to the model.

With these plus the existing emit_paragraph, Qwen can: (a) propose a change, (b) write it to disk, (c) run build, (d) emit an event summarizing success/failure. Human reviewer (Claude, for now) still does the git commit + push.

Acceptance: scripts/qwen-harness.py 'Update /methodology to add a new bullet about X; run pnpm build; log the result' completes in one run, build green, the new content visible on the local dev server.
