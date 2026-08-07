---
title: Stay on Railway (status quo)
verdict: provisional
---

## What It Is

Keep the current 'web' service on Railway with its mounted /data volume + GitHub Actions deploy workflow. No migration, no cutover risk. Eats the monthly bill in exchange for zero hand-on-controls work.

## Validation Checklist

- [ ] Claim 1: _TBD_
- [ ] Current Railway bill runs on the order of $5-20/mo for a single 'web' service with a small persistent volume (exact figure lives in the Railway dashboard; cost is negligible relative to the EPYC's fixed $299.64/mo).: _TBD_
- [ ] Contradicts the site's own thesis — we claim "local AI is here, already yours" while running on a third-party PaaS. The content is on-thesis; the hosting is not. Visible to a reader who looks.: _TBD_
- [ ] Operational overhead is ~zero. Deploy workflow (`.github/workflows/deploy.yml` after PRs #66 + #72) is working. Volume persistence is handled. No hand-on-controls work required to keep it running.: _TBD_

## Scoring

_Not yet scored._
