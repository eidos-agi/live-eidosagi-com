---
id: TASK-0042
title: 'move continuous services off the laptop onto the EPYC bare-metal (GOAL-002 piece 1)'
status: To Do
created: '2026-04-17'
priority: High
---

Every process that makes live.eidosagi.com look alive currently runs on Daniel's laptop:

- `scripts/live-racer.py` (race tick every 90 s, 3 × SSH fan-out)
- any future scheduled `qwen-harness.py` runs
- the Python cron loops armed via `CronCreate` in this Claude session
- eidos-mail daemon (per MEMORY.md)
- Omni adapters

**Consequence:** laptop sleeps → site goes visibly dark. A benchmarked long-weekend would break the story.

**Target host:** HOSTKEY EPYC bare-metal, `epyc-56223.eidosagi.com` (162.120.18.7), 2×EPYC 7551 / 384 GB / Ubuntu 24.04 / Docker 29.3.0 / Compose 5.1.1 per MEMORY.md. SSH available on port 22 (root key-only) or 2299 (eidos, passwordless sudo).

**Acceptance:**
- `live-racer` runs as a systemd unit on the EPYC, not a `python3 ... &` on a laptop.
- A planned `scripts/qwen-orchestrator.py` (see TASK-0045) also runs there, scheduled via systemd timer or a tiny supervisor.
- Restart after host reboot is automatic. Laptop can be closed for a weekend and the race lineup + event feed keeps filling.

**First step:** a `eidos-infra/machines/hostkey-epyc-56223/compose.yml` with a `live-racer` service (python image, volume-mount the SSH keys for the 3 GPU hosts, env-set `INGEST_TOKEN`). Deploy. Verify the Activity feed starts showing benchmark events sourced from the EPYC, not the laptop.
