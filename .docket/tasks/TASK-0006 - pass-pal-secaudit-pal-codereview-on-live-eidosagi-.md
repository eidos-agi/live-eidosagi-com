---
id: TASK-0006
title: Pass pal:secaudit + pal:codereview on live-eidosagi-com
status: To Do
created: '2026-04-17'
priority: Medium
milestone: Phase 3 — Full GPU Battery Visible
---
Run both against current main. Fix any HIGH/CRITICAL findings before announcing. Focus areas: /api/ingest auth, /api/github-webhook HMAC, chat rate limit + IP hashing, SQL injection surface (should be zero — better-sqlite3 is parameterized throughout).
