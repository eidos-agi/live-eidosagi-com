---
title: Hybrid — Cloudflare in front of EPYC origin
verdict: provisional
---

## What It Is

Cloudflare (or Vercel Edge) caches static routes + shields the EPYC origin. Dynamic routes (including all SSE) tunnel through via Cloudflare's orange-cloud or Tunnel. Adds CDN cache + DDoS shielding on top of the full-migrate setup.

## Validation Checklist

- [ ] Claim 1: _TBD_
- [ ] Cloudflare orange-cloud shields the EPYC's public IP from direct traffic. DDoS protection + WAF on top of the origin we own. Static assets (favicon, fonts, OG image) hit edge cache, reducing EPYC load.: _TBD_
- [ ] Cloudflare's default SSE behavior is proxy-friendly but enables response buffering at edge tiers; SSE can work but often requires enabling Cloudflare Tunnel (no buffering) or disabling the orange-cloud for /api/events/stream + /api/chat/stream. Adds a per-route config surface PR #82's simpler full-migrate avoids.: _TBD_
- [ ] Introduces a third party between us and the site — partially reverses the "runs on hardware we own" story of the full-migrate. Worth doing *only* if observed traffic actually threatens EPYC origin stability, which is not yet measured.: _TBD_

## Scoring

_Not yet scored._
