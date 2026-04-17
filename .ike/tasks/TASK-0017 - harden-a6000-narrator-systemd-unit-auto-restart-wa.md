---
id: TASK-0017
title: 'Harden A6000 narrator: systemd unit + auto-restart + watchdog'
status: To Do
created: '2026-04-17'
priority: Medium
---
The daemon is running under `setsid` today — dies if the instance reboots or the process crashes. Make it durable:
1. Write a `/etc/systemd/system/eidos-narrator.service` unit with Restart=always, RestartSec=10s, env vars sourced from /etc/eidos-narrator.env.
2. Add `scripts/install-narrator-systemd.sh` that ssh's in, drops the unit file, enables it, starts it, verifies `systemctl status`.
3. Server-side watchdog in /api/savings: if no `eidos-local` event has landed in the last 300s while the daemon should be running, flip a health flag and surface 'narrator stalled' on the SavingsStrip.

**Acceptance**: reboot the A6000 instance, daemon comes back in < 30s, no manual intervention.
