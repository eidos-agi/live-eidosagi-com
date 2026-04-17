-- Relax events.actor CHECK constraint.
--
-- 001_init.sql pinned actor to ('claude','human','system','github','thunder','benchmark').
-- We've since added: 'eidos' (public rename), 'eidos-local' (A6000 llama),
-- 'local-llm' and 'qwen-coder' (Phase 4 self-cheapening narrators).
--
-- SQLite can't ALTER a CHECK constraint in place, so we rebuild the table.
-- All indexes are recreated. Table is tiny (a few thousand rows max) so this
-- runs in milliseconds.

BEGIN;

CREATE TABLE events_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  session_id TEXT NOT NULL,
  actor TEXT NOT NULL CHECK (actor IN (
    'eidos', 'eidos-local',
    'claude',
    'local-llm', 'qwen-coder',
    'human', 'system', 'github', 'thunder', 'benchmark'
  )),
  kind TEXT NOT NULL,
  summary TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '{}',
  icon TEXT,
  related_run TEXT,
  deleted_at INTEGER
);

INSERT INTO events_new
  (id, ts, session_id, actor, kind, summary, details, icon, related_run, deleted_at)
  SELECT id, ts, session_id, actor, kind, summary, details, icon, related_run, deleted_at
  FROM events;

DROP TABLE events;
ALTER TABLE events_new RENAME TO events;

CREATE INDEX IF NOT EXISTS events_ts ON events(ts DESC);
CREATE INDEX IF NOT EXISTS events_session ON events(session_id, ts DESC);
CREATE INDEX IF NOT EXISTS events_kind ON events(kind, ts DESC);

COMMIT;
