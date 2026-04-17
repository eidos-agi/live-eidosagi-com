---
id: TASK-0030
title: 'A6000 Ollama OOMs when large model loads — needs watchdog or smaller-only policy'
status: To Do
created: '2026-04-17'
priority: High
---

Detected during BENCHMARK CHECK audit at 2026-04-17 ~20:58 UTC: A6000 (69.19.136.6 port 30117) had been silent in the race rotation for hours. Root cause from `/tmp/ollama.log`:

```
20:15:26 [warning]  CPU memory usage at 90.3%
20:15:32 [critical] CPU memory usage at 95.5%
20:15:36 [critical] CPU memory usage at 98.9%, process may exit shortly
```

Thunder Compute's prototyping-tier A6000 VM has tight host memory. Loading a large model (probably qwen2.5:72b or qwen3.6:35b-a3b) into Ollama triggered an OOM kill around 20:15 UTC. Ollama never came back.

Restarted with `nohup ollama serve > /tmp/ollama.log 2>&1 & disown` at 20:58 UTC. Currently responding `{"version":"0.21.0"}`. Back in rotation for the next race tick.

Follow-up options:
1. **Watchdog**: cron/launchd on A6000 that restarts Ollama if the HTTP endpoint is unresponsive. Simplest fix.
2. **Model allowlist on A6000**: the `has_model` check in live-racer.py already prevents racing models that aren't pulled. But the A6000 probably *had* qwen2.5:72b pulled — pulling != loading. A pre-race VRAM check could skip models larger than N GB on the A6000.
3. **Drop A6000 from the race**: it's the slowest and cheapest, and consistently can't hold large models. Demote to llama3.2:1b + qwen2.5:1.5b only.

Acceptance: A6000 participates in every race of a model it can hold, and if Ollama dies it's back up within 2 minutes.
