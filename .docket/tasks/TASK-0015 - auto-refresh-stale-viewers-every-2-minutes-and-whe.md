---
id: TASK-0015
title: Auto-refresh stale viewers every 2 minutes (and when a new run ignites)
status: To Do
created: '2026-04-17'
priority: High
---
SSE is now live for /api/events, so the ActivitySidebar feed stays fresh on open tabs. But the RaceBoard, SavingsStrip, NOW/IDLE status strip, and any run-context state still require a hard refresh to pull new run metadata / new lanes / new model labels / updated savings.

**Ship**:
1. A lightweight `AutoRefresh` client component mounted in `layout.tsx`. Every 120s it dispatches `router.refresh()` (Next.js App Router), which re-runs server components (RaceBoard, hero, /models snapshots). Does NOT force-reload the page — so SSE connections stay alive, scroll positions survive.
2. Skip the refresh if `document.hidden` (don't refresh backgrounded tabs — saves server).
3. When a `run_start` event arrives on `/api/events/stream`, trigger an immediate refresh (so a new lane ignites without the 2-minute wait).
4. Optional: expose a one-shot env knob `NEXT_PUBLIC_AUTO_REFRESH_MS` (default 120000) so we can tune without code changes.

**Acceptance**:
- Leave a tab open for 5 minutes with no interaction → RaceBoard reflects the current state at T+2m, T+4m without any manual reload.
- Emit a run_start event → that tab renders the new run within ~1s, not at next tick.
- Stays visible while backgrounded (no scroll jump, no flash).

**Related**: visionlog goal "beautiful, living, properly cached"; GUARD-002 (feed cadence).
