---
title: Full migration to EPYC (Docker + Caddy + SQLite volume)
verdict: provisional
---

## What It Is

Move the entire Next.js app onto the HOSTKEY EPYC bare-metal via docker-compose + Caddy. SQLite file ferries via scp, DNS flips from Railway edge to EPYC's public IP. Site then runs on hardware we own, consistent with the site's own thesis (local inference, local hosting). Scaffolding is PR #82.

## Validation Checklist

- [ ] Claim 1: _TBD_
- [ ] EPYC bare-metal is already paid ($299.64/mo fixed per MEMORY.md). Moving the site there adds $0 marginal cost — the RAM headroom (384 GB total, barely used) is free.: _TBD_
- [ ] Keystone of GOAL-002 — once the site runs on the EPYC, the multi-agent harness (TASK-0045), doc retrieval index (TASK-0044), live-racer (TASK-0042), and the inference bridge to the H100 (TASK-0043) all converge on the same machine. Single host, single ops story.: _TBD_
- [ ] SSE compatibility verified in scaffolding — Caddy's default reverse_proxy passes through SSE without buffering. No `/api/events/stream` or `/api/chat/stream` regression expected (would need nginx-style `proxy_buffering off` on other reverse proxies).: _TBD_
- [ ] Cutover risk is bounded by the 48h dry-run on `epyc.live.eidosagi.com` subdomain before the main-domain DNS flip. If SSE lag, TLS issue, or load issue shows up on the dry-run, the main domain never points at the EPYC until it's fixed.: _TBD_

## Scoring

_Not yet scored._
