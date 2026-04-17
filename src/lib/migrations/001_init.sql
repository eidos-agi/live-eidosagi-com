-- eidos-live initial schema (SQLite)
-- Soft-delete convention: never DELETE, always set deleted_at and filter reads.
-- Timestamps (ts / started_at / ended_at / recorded_at / deleted_at) are unix
-- epoch milliseconds stored as INTEGER so SQLite ORDER BY behaves predictably.

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  session_id TEXT NOT NULL,
  actor TEXT NOT NULL CHECK (actor IN ('claude','human','system','github','thunder','benchmark')),
  kind TEXT NOT NULL,
  summary TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '{}',
  icon TEXT,
  related_run TEXT,
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS events_ts ON events(ts DESC);
CREATE INDEX IF NOT EXISTS events_session ON events(session_id, ts DESC);
CREATE INDEX IF NOT EXISTS events_kind ON events(kind, ts DESC);

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  status TEXT NOT NULL DEFAULT 'running',
  session_id TEXT,
  prompt_label TEXT,
  gpus TEXT NOT NULL,
  models TEXT NOT NULL,
  note TEXT,
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS runs_started ON runs(started_at DESC);

CREATE TABLE IF NOT EXISTS progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  run_id TEXT NOT NULL,
  gpu_id TEXT NOT NULL,
  model TEXT NOT NULL,
  use_case TEXT,
  tok_per_sec REAL,
  latency_ms REAL,
  vram_used_mb REAL,
  eval_idx INTEGER,
  eval_total INTEGER
);
CREATE INDEX IF NOT EXISTS progress_run_ts ON progress(run_id, ts);

CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  gpu_id TEXT NOT NULL,
  model TEXT NOT NULL,
  use_case TEXT NOT NULL,
  test_case_id TEXT,
  composite REAL,
  dimensions TEXT,
  tok_per_sec REAL,
  recorded_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS scores_run ON scores(run_id);

CREATE TABLE IF NOT EXISTS repo_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  repo TEXT NOT NULL,
  kind TEXT NOT NULL,
  actor TEXT,
  ref TEXT,
  sha TEXT,
  title TEXT,
  url TEXT NOT NULL,
  summary TEXT,
  meta TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS repo_activity_ts ON repo_activity(ts DESC);

CREATE TABLE IF NOT EXISTS artifacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  run_id TEXT,
  session_id TEXT,
  kind TEXT NOT NULL,
  label TEXT NOT NULL,
  url TEXT,
  bytes INTEGER,
  sha256 TEXT,
  meta TEXT NOT NULL DEFAULT '{}'
);
