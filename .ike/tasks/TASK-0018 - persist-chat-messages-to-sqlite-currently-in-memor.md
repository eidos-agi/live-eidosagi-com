---
id: TASK-0018
title: Persist chat messages to SQLite (currently in-memory — lost on every deploy)
status: To Do
created: '2026-04-17'
priority: High
---
ChatSidebar posts via /api/chat which (from earlier audit) uses an in-memory fallback because better-sqlite3 failed to load at build time. Messages disappear on every Railway deploy — viewers on the live-event page lose their conversation minutes after it starts.

Fix:
1. Verify src/lib/chat.ts is actually using better-sqlite3 (the sibling pattern from src/lib/db.ts). If it's falling back to in-memory, figure out why the lazy require is failing — may need `better-sqlite3` as a production dep not just devDep, or the native binding didn't get built for the Railway nixpacks Linux image.
2. Ensure chat_messages table (migration 002_chat.sql) is actually being created on first access — currently schema_migrations may not be running it because ChatSidebar mounts a different DB connection.
3. Once persistence works: backfill a "welcome" message from @eidos on boot so an empty chat has something warm instead of "no messages yet — say hello" at all.
4. Test: post a message, redeploy, confirm it survives.

**Why now**: the live event is on LinkedIn. Viewers who comment on the page then see their message vanish on the next deploy look at a broken demo. High visible credibility risk.
