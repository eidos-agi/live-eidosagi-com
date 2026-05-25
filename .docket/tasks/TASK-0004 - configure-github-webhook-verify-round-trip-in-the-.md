---
id: TASK-0004
title: Configure GitHub webhook + verify round-trip in the feed
status: To Do
created: '2026-04-17'
priority: Medium
milestone: Phase 2 — Self-Portrait Loop
---
Set webhook on eidos-agi/live-eidosagi-com: URL https://live.eidosagi.com/api/github-webhook, secret from Railway GITHUB_WEBHOOK_SECRET, events push + pull_request + pull_request_review. Push a trivial commit, confirm repo_activity row lands + event appears in sidebar.
