---
id: TASK-0005
title: Caching pass — ISR for /methodology, /about, /models; no-store on /api/events
  + /api/chat
status: To Do
created: '2026-04-17'
priority: Medium
milestone: Phase 3 — Full GPU Battery Visible
---
Next.js `export const revalidate = 900` on the static-ish pages. `cache-control: no-store` on the mutable API routes. Cloudflare cache rules on /og.png and /_next/static. Lighthouse check before/after.
