---
id: TASK-0047
title: 'stale-benchmark detector — flip SavingsStrip / BenchmarkPulse to "stale" when no race has landed in > 10 min'
status: To Do
created: '2026-04-17'
priority: High
---

Surfaced 2026-04-17 ~22:55 UTC during a combined audit: latest benchmark event was 49 min old; the SavingsStrip bar was still happily showing 77.6% filled, the home page still looked alive. The laptop-based `live-racer.py` process had stopped but nothing visible on the site said so.

**The bug shape:** a visitor looking at live.eidosagi.com during a benchmark drought sees a page that looks active (shimmer animates, chat populates from other sources, the activity feed keeps getting GitHub webhook events) but the thesis-critical data — actual benchmark races — has gone quiet. The site silently lies.

**Fix:**

1. **Data source.** `SELECT MAX(ts) FROM events WHERE actor='benchmark' AND deleted_at IS NULL` gives the last-race-ts. Compute `stale_seconds = (now - last_race_ts) / 1000`.

2. **UI surfacing.**
   - `BenchmarkPulse` already has a `stale` branch (fades the dot after 10 min). Wire it to the actual last-benchmark-ts, not just the component's `ev.ts` (same thing if the client poll runs, but a drought means no client poll either).
   - `SavingsStrip` should show a subtle stale state: desaturate the shimmer + add a small "stale · last race Nm ago" next to the "pulling ahead" label. Current bar color → amber `muted` when stale > 15 min, `danger` when stale > 30 min.
   - `RaceBoard` header could read "waiting for next race" when `stale_seconds > TICK_SECONDS * 2`.

3. **Nice-to-have:** a `/api/health` endpoint returning `{last_race_ts, stale_seconds, critical: bool}` so a future pager (GOAL-002 piece 1's continuous supervision) can hook it.

**Acceptance:** during a 10+ min benchmark drought, a cold-landing visitor sees a visually-honest "stale" state, not a frozen 78% bar. When races resume, the UI returns to live within 1 refresh cycle.

**Related:** TASK-0042 (move racer to EPYC) is the permanent fix for droughts. This is the consolation patch until that lands.
