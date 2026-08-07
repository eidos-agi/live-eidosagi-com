---
id: TASK-0032
title: 'properly cached — the untouched vision beat (SSR revalidate + s-maxage on stable APIs)'
status: To Do
created: '2026-04-17'
priority: High
---

Hourly refocus (2026-04-17 ~21:30 UTC): of the seven beats in the vision — beautiful, living-streaming, interactive, impressive, LIVE, properly logged, properly cached, properly researched — the one we haven't touched this hour is **properly cached**.

The site currently does the opposite: nearly every API route has `Cache-Control: no-store`. That's correct for SSE + activity-feed endpoints, but overkill for:

- `/api/savings` — updates every 15s anyway, serve with `public, s-maxage=10, stale-while-revalidate=30`
- `/api/models` + `/api/models/catalog` — leaderboard rows update on benchmark cadence (~90s). `s-maxage=60, swr=120`.
- `/research/*` pages — authored content, rarely changes. Next.js `export const revalidate = 300` + tag-invalidate on deploy.
- `/up-next` — reads .ike directory at build time; revalidate hourly.

Do NOT cache:
- `/api/events` (live feed)
- `/api/events/stream` (SSE)
- `/api/chat` + `/api/chat/stream`
- `/api/ingest` (POST, already exempt)

Expected outcome: faster first paint for returning visitors, lower hosted cost at scale (Railway bills per-request CPU), no impact on the live story (the streaming paths stay no-store).

Acceptance: Lighthouse audit on `/research/how-it-works` shows 2nd visit is served from cache; `/api/savings` `cache-control` header includes `s-maxage`; streaming endpoints still `no-store` verified.
