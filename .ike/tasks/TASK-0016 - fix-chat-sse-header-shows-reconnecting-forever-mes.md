---
id: TASK-0016
title: Fix chat SSE — header shows 'reconnecting' forever, messages don't stream
status: To Do
created: '2026-04-17'
priority: High
---
/api/chat/stream exists and emits 'initial' + 'message' events, but the ChatSidebar dot/label stays stuck on 'reconnecting' in production. Likely causes:
1. `EventSource` is hitting a 502/empty body because Railway's proxy is closing the stream before the first event. The keepalive is at 15s — maybe bump to 10s AND send an initial comment immediately on connect.
2. The in-memory `subscribe()` in src/lib/chat.ts may not persist across Next.js serverless route invocations — on Railway (single long-running Node process) it should be fine, but needs verification. Add a log/health that exposes subscriber count.
3. The `EventSource.onopen` might never fire if the response is buffered. Ensure `X-Accel-Buffering: no` and that the runtime is nodejs (not edge) — already set per 001, but check.
4. Browser dev-tools: look for `EventSource readyState === 2 (CLOSED)`. If so, the initial connect is failing outright. Hit the URL directly with curl to see what comes back.

**Acceptance**: open live.eidosagi.com in a fresh tab — within 2s the chat header dot goes green and the label reads 'live'. Post a test message from another tab — it appears in <1s without a polling round-trip. If fallback polling is the only path, rewrite ChatSidebar to poll-every-5s with the same UX.
