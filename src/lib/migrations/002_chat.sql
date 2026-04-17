-- 002_chat.sql — chat_messages for the public chat sidebar.
-- Additive to 001_init.sql; safe to run multiple times.
--
-- Notes:
--   - `ip_hash` is SHA-256(ip + CHAT_IP_SALT). Never store raw IPs.
--   - `deleted_at` soft-deletes messages (moderation, abuse reversal).
--   - Messages matched by the bad-word filter are inserted with
--     deleted_at = ts + 1 so they never render but remain auditable.

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  handle TEXT NOT NULL,
  body TEXT NOT NULL,
  ip_hash TEXT,
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS chat_messages_ts ON chat_messages(ts DESC);
