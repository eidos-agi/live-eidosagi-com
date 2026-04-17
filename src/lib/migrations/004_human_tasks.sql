-- Human task queue.
--
-- Things the agent needs from the human: a URL, an approval, a password,
-- a decision. Posted via /api/ingest kind='human_task'; rendered on
-- /human-tasks. The human clicks Done (or Won't Do) to resolve.

CREATE TABLE IF NOT EXISTS human_tasks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ts           INTEGER NOT NULL,
  session_id   TEXT NOT NULL,
  title        TEXT NOT NULL,
  details      TEXT NOT NULL DEFAULT '{}',
  status       TEXT NOT NULL DEFAULT 'open'
               CHECK (status IN ('open', 'done', 'wontdo', 'blocked')),
  priority     TEXT NOT NULL DEFAULT 'normal'
               CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  url          TEXT,
  resolved_at  INTEGER,
  resolved_by  TEXT,
  deleted_at   INTEGER
);

CREATE INDEX IF NOT EXISTS human_tasks_status_ts ON human_tasks(status, ts DESC);
CREATE INDEX IF NOT EXISTS human_tasks_ts ON human_tasks(ts DESC);
