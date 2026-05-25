---
id: TASK-0039
title: 'BenchmarkPulse SSR seed — kill "waiting for signal" flash on first paint'
status: To Do
created: '2026-04-17'
priority: Normal
---

UX impression check (2026-04-17 ~21:50 UTC) after deploy landed: the new BenchmarkPulse strip under SavingsStrip renders `● benchmark · waiting for signal` on first paint. After hydration + client fetch (~200-500 ms), it swaps to real data (`● last race  H100 · qwen3.6:35b-a3b · 409 tok/s · 47s ago`). The gap is short but first impressions happen in that window.

Pattern to copy: `SavingsStrip` + `SavingsStripServer` (server wrapper reads DB, passes `initialSeed` prop, client hydrates seamlessly).

Ship:
1. `src/components/BenchmarkPulseServer.tsx` — server component that calls `listEvents({actor:'benchmark', limit:1})` or equivalent helper.
2. Extend `listEvents` options in `src/lib/db.ts` to accept `actor?: string` filter.
3. Update `BenchmarkPulse.tsx` to accept `initial?: ActivityEvent` prop. If present, seed state at mount; `lastIdRef` initialized so first fetch doesn't flash-animate.
4. Swap `<BenchmarkPulse />` for `<BenchmarkPulseServer />` in `src/app/layout.tsx`.

Acceptance: `curl https://live.eidosagi.com | grep "last race"` returns a hit immediately on first paint (no "waiting for signal" for rows that would have landed > 0s ago).

Delegate candidate: Qwen via PR #74's widened harness once approved.
