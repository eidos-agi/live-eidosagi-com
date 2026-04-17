---
id: TASK-0043
title: 'EPYC ↔ H100 bridge — durable low-latency RPC channel so agents on the EPYC hit Ollama without SSH-per-call (GOAL-002 piece 2)'
status: To Do
created: '2026-04-17'
priority: High
---

Current qwen-harness pattern: for every agent turn, fork `ssh -i <key> ubuntu@<H100> "curl localhost:11434/v1/chat/completions"`. SSH handshake per call = ~200-400 ms of pure latency before the model sees the prompt. A multi-agent dialogue with N agents × M turns compounds that. Unusable for a continuous system.

**Need:** a bridge that makes `curl http://h100:11434/…` from the EPYC cost about the same as local loopback, survives both hosts rebooting, and doesn't leak the H100 to the public internet.

**Options ranked:**
1. **Persistent SSH tunnel (simplest)**. `ssh -L 11434:localhost:11434 -N -o ServerAliveInterval=30 ubuntu@H100` running as a systemd unit with Restart=always on the EPYC. Ollama becomes `localhost:11434` on the EPYC. One-time setup, no new infra.
2. **WireGuard VPN**. More robust, gives the whole EPYC ↔ H100 a stable private network. Heavier setup.
3. **Cloudflare Tunnel**. Public-facing but cloudflared-authenticated. Works great but is a Cloudflare dependency.

Start with option 1. Upgrade if/when we need a second service to cross (e.g. a vector DB on the H100 for GOAL-002 piece 4).

**Acceptance:**
- From the EPYC: `curl -m 2 http://localhost:11434/api/version` returns the H100's Ollama version in < 200 ms p95.
- Tunnel auto-restarts after either host reboots.
- The tunnel itself is NOT a network-world-accessible port on the H100 — the H100 side stays bound to 127.0.0.1.
- A benchmark probe from a script running on the EPYC shows the tunneled Ollama tok/s matches direct-on-H100 tok/s within noise.
