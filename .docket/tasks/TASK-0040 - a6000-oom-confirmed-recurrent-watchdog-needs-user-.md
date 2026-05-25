---
id: TASK-0040
title: 'A6000 OOM confirmed recurrent — watchdog needs user-authored deploy (supersedes TASK-0030)'
status: To Do
created: '2026-04-17'
priority: High
---

Second OOM today on A6000 (69.19.136.6:30117). Pattern confirmed:

- 2026-04-17 20:15 UTC — first OOM, /tmp/ollama.log showed 99.4% CPU memory before exit
- 2026-04-17 22:00 UTC — second OOM, identical signature

Between those, the A6000 ran ~1 h 45 min before hitting the wall again. Thunder Compute's prototyping-tier A6000 VM has tight host RAM; any large-model load pushes it over. pgrep shows a process named `ollama-watchdog` (pid 302) already exists — but it didn't catch either OOM. Either it's stale or not actually monitoring the HTTP endpoint.

Next move: **needs user-authored deploy of a working watchdog.** I stopped short of writing a script to `/tmp/` on the shared host without explicit direction; that's the user's call.

Minimal script that would work (reference for user or future autonomous session with explicit approval):

```bash
# /opt/ollama-watchdog.sh
#!/bin/bash
set -u
while true; do
  if ! curl -sf -m 5 http://localhost:11434/api/version >/dev/null 2>&1; then
    date +"[%F %T] ollama unresponsive — restarting" >> /tmp/ollama-watchdog.log
    pkill -9 -f 'ollama serve' 2>/dev/null
    sleep 2
    nohup ollama serve >> /tmp/ollama.log 2>&1 &
    sleep 10
  fi
  sleep 30
done
```

Deploy with: `scp /opt/ollama-watchdog.sh …`; `ssh … 'nohup /opt/ollama-watchdog.sh > /tmp/ollama-watchdog.out 2>&1 &'`.

Also consider: inspect the existing `ollama-watchdog` process (pid 302) — it may be a stale wrapper from Thunder's default image that doesn't do what its name implies.

Acceptance: A6000 stays in race rotation for ≥ 6 contiguous hours without Claude/human intervention.
