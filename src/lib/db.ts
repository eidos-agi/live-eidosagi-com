// SQLite-backed store for the live.eidosagi.com dashboard.
//
// Replaces the previous pg + filesystem hybrid. Everything lives in a single
// file on a Railway persistent volume mounted at /data (configurable via
// DATABASE_PATH). Migrations auto-run on first access.
//
// better-sqlite3 is synchronous, which lines up well with Next.js server
// components and API routes -- no connection pool, no promise chains.
//
// Soft-delete convention: never DELETE, set deleted_at. Reads filter
// deleted_at IS NULL.

import Database, { type Database as DB } from "better-sqlite3";
import fsSync from "node:fs";
import path from "node:path";

const DEFAULT_DB_PATH = "/data/eidos-live.sqlite";

interface DbHolder {
  __eidosLiveDb?: DB | null;
  __eidosLiveDbPath?: string | null;
}

function resolveDbPath(): string {
  return process.env.DATABASE_PATH ?? DEFAULT_DB_PATH;
}

function runMigrations(db: DB): void {
  // Tiny tracker table so each file runs exactly once.
  db.exec(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       name TEXT PRIMARY KEY,
       applied_at INTEGER NOT NULL
     )`,
  );
  const applied = new Set(
    (db.prepare("SELECT name FROM schema_migrations").all() as Array<{
      name: string;
    }>).map((r) => r.name),
  );

  const dir = path.join(process.cwd(), "src", "lib", "migrations");
  const files = fsSync
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort(); // 001_... runs before 002_... runs before 003_...

  const record = db.prepare(
    "INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)",
  );
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fsSync.readFileSync(path.join(dir, file), "utf8");
    db.exec(sql);
    record.run(file, Date.now());
  }
}

export function getDb(): DB {
  const holder = globalThis as unknown as DbHolder;
  if (holder.__eidosLiveDb) return holder.__eidosLiveDb;

  const dbPath = resolveDbPath();
  const dir = path.dirname(dbPath);
  try {
    fsSync.mkdirSync(dir, { recursive: true });
  } catch {
    // ignore -- will surface on open if actually broken
  }

  const database = new Database(dbPath);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  database.pragma("busy_timeout = 5000");
  runMigrations(database);

  holder.__eidosLiveDb = database;
  holder.__eidosLiveDbPath = dbPath;
  return database;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type Actor =
  | "eidos"
  | "eidos-local"
  | "claude" // historical pre-rename
  | "local-llm"
  | "qwen-coder"
  | "human"
  | "system"
  | "github"
  | "thunder"
  | "benchmark";

export interface ActivityEvent {
  id: number;
  ts: string;
  sessionId: string;
  actor: string;
  kind: string;
  summary: string;
  details: Record<string, unknown>;
  icon: string | null;
  relatedRun: string | null;
}

interface EventRow {
  id: number;
  ts: number;
  session_id: string;
  actor: string;
  kind: string;
  summary: string;
  details: string;
  icon: string | null;
  related_run: string | null;
}

function rowToEvent(row: EventRow): ActivityEvent {
  let details: Record<string, unknown> = {};
  try {
    details = row.details ? JSON.parse(row.details) : {};
  } catch {
    details = {};
  }
  return {
    id: row.id,
    ts: new Date(row.ts).toISOString(),
    sessionId: row.session_id,
    actor: row.actor,
    kind: row.kind,
    summary: row.summary,
    details,
    icon: row.icon,
    relatedRun: row.related_run,
  };
}

export interface InsertEventInput {
  sessionId: string;
  actor: Actor | string;
  kind: string;
  summary: string;
  details?: Record<string, unknown>;
  icon?: string | null;
  relatedRun?: string | null;
  ts?: number | string | Date;
}

function toMillis(v: number | string | Date | undefined): number {
  if (v === undefined || v === null) return Date.now();
  if (v instanceof Date) return v.getTime();
  if (typeof v === "number") return v;
  const parsed = Date.parse(v);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

// In-process pub/sub for new events. SSE subscribers in the /api/events/stream
// route attach listeners here; insertEvent broadcasts every successful commit.
type EventListener = (ev: ActivityEvent) => void;
interface EventBusHolder {
  __eidosLiveEventBus?: Set<EventListener>;
}
function eventBus(): Set<EventListener> {
  const h = globalThis as unknown as EventBusHolder;
  if (!h.__eidosLiveEventBus) h.__eidosLiveEventBus = new Set();
  return h.__eidosLiveEventBus;
}
export function subscribeEvents(listener: EventListener): () => void {
  const bus = eventBus();
  bus.add(listener);
  return () => {
    bus.delete(listener);
  };
}
function broadcastEvent(ev: ActivityEvent): void {
  for (const l of eventBus()) {
    try {
      l(ev);
    } catch {
      // one bad listener shouldn't kill the others
    }
  }
}

export function insertEvent(
  input: InsertEventInput,
): { id: number; event: ActivityEvent } {
  const db = getDb();
  const ts = toMillis(input.ts);
  const info = db
    .prepare(
      `INSERT INTO events (ts, session_id, actor, kind, summary, details, icon, related_run)
       VALUES (@ts, @session_id, @actor, @kind, @summary, @details, @icon, @related_run)`,
    )
    .run({
      ts,
      session_id: input.sessionId,
      actor: input.actor,
      kind: input.kind,
      summary: input.summary,
      details: JSON.stringify(input.details ?? {}),
      icon: input.icon ?? null,
      related_run: input.relatedRun ?? null,
    });
  const id = Number(info.lastInsertRowid);
  const row = db
    .prepare(
      `SELECT id, ts, session_id, actor, kind, summary, details, icon, related_run
       FROM events WHERE id = ?`,
    )
    .get(id) as EventRow;
  const event = rowToEvent(row);
  broadcastEvent(event);
  return { id, event };
}

export interface ListEventsOpts {
  limit?: number;
  sessionId?: string | null;
  /** epoch ms cursor — return events strictly older than this timestamp. */
  beforeTs?: number | null;
}

export function listEvents(opts: ListEventsOpts = {}): ActivityEvent[] {
  const db = getDb();
  const limit = Math.max(1, Math.min(500, opts.limit ?? 50));
  const before =
    opts.beforeTs != null && Number.isFinite(opts.beforeTs)
      ? opts.beforeTs
      : null;

  if (opts.sessionId) {
    const rows = before
      ? (db
          .prepare(
            `SELECT id, ts, session_id, actor, kind, summary, details, icon, related_run
             FROM events
             WHERE deleted_at IS NULL AND session_id = ? AND ts < ?
             ORDER BY ts DESC
             LIMIT ?`,
          )
          .all(opts.sessionId, before, limit) as EventRow[])
      : (db
          .prepare(
            `SELECT id, ts, session_id, actor, kind, summary, details, icon, related_run
             FROM events
             WHERE deleted_at IS NULL AND session_id = ?
             ORDER BY ts DESC
             LIMIT ?`,
          )
          .all(opts.sessionId, limit) as EventRow[]);
    return rows.map(rowToEvent);
  }

  if (before) {
    const rows = db
      .prepare(
        `SELECT id, ts, session_id, actor, kind, summary, details, icon, related_run
         FROM events
         WHERE deleted_at IS NULL AND ts < ?
         ORDER BY ts DESC
         LIMIT ?`,
      )
      .all(before, limit) as EventRow[];
    return rows.map(rowToEvent);
  }

  const rows = db
    .prepare(
      `SELECT id, ts, session_id, actor, kind, summary, details, icon, related_run
       FROM events
       WHERE deleted_at IS NULL
       ORDER BY ts DESC
       LIMIT ?`,
    )
    .all(limit) as EventRow[];
  return rows.map(rowToEvent);
}

/** Return the single most-recent event authored by `actor`, or null. */
export function latestEventByActor(actor: string): ActivityEvent | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, ts, session_id, actor, kind, summary, details, icon, related_run
       FROM events
       WHERE deleted_at IS NULL AND actor = ?
       ORDER BY ts DESC
       LIMIT 1`,
    )
    .get(actor) as EventRow | undefined;
  return row ? rowToEvent(row) : null;
}

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------

export interface GpuConfig {
  name: string;
  type?: string;
  vramGB?: number;
  costPerHour?: number;
  [k: string]: unknown;
}

export interface Run {
  id: string;
  startedAt: string;
  endedAt: string | null;
  status: string;
  sessionId: string | null;
  promptLabel: string | null;
  gpus: GpuConfig[];
  models: string[];
  note: string | null;
}

interface RunRow {
  id: string;
  started_at: number;
  ended_at: number | null;
  status: string;
  session_id: string | null;
  prompt_label: string | null;
  gpus: string;
  models: string;
  note: string | null;
}

function rowToRun(row: RunRow): Run {
  let gpus: GpuConfig[] = [];
  let models: string[] = [];
  try {
    gpus = row.gpus ? JSON.parse(row.gpus) : [];
  } catch {
    gpus = [];
  }
  try {
    models = row.models ? JSON.parse(row.models) : [];
  } catch {
    models = [];
  }
  return {
    id: row.id,
    startedAt: new Date(row.started_at).toISOString(),
    endedAt: row.ended_at ? new Date(row.ended_at).toISOString() : null,
    status: row.status,
    sessionId: row.session_id,
    promptLabel: row.prompt_label,
    gpus,
    models,
    note: row.note,
  };
}

export interface RunStartInput {
  runId: string;
  gpus: GpuConfig[];
  models: string[];
  sessionId?: string | null;
  promptLabel?: string | null;
  note?: string | null;
  startedAt?: number | string | Date;
  status?: string;
}

export function upsertRunStart(input: RunStartInput): Run {
  const db = getDb();
  const startedAt = toMillis(input.startedAt);
  db.prepare(
    `INSERT INTO runs (id, started_at, status, session_id, prompt_label, gpus, models, note)
     VALUES (@id, @started_at, @status, @session_id, @prompt_label, @gpus, @models, @note)
     ON CONFLICT(id) DO UPDATE SET
       started_at = excluded.started_at,
       status = excluded.status,
       session_id = COALESCE(excluded.session_id, runs.session_id),
       prompt_label = COALESCE(excluded.prompt_label, runs.prompt_label),
       gpus = excluded.gpus,
       models = excluded.models,
       note = COALESCE(excluded.note, runs.note)`,
  ).run({
    id: input.runId,
    started_at: startedAt,
    status: input.status ?? "running",
    session_id: input.sessionId ?? null,
    prompt_label: input.promptLabel ?? null,
    gpus: JSON.stringify(input.gpus ?? []),
    models: JSON.stringify(input.models ?? []),
    note: input.note ?? null,
  });
  const row = db
    .prepare(
      `SELECT id, started_at, ended_at, status, session_id, prompt_label, gpus, models, note
       FROM runs WHERE id = ?`,
    )
    .get(input.runId) as RunRow;
  return rowToRun(row);
}

export interface RunEndInput {
  runId: string;
  status?: string;
  note?: string | null;
  endedAt?: number | string | Date;
}

export function updateRunEnd(input: RunEndInput): Run | null {
  const db = getDb();
  const endedAt = toMillis(input.endedAt);
  const existing = db
    .prepare(
      `SELECT id, started_at, ended_at, status, session_id, prompt_label, gpus, models, note
       FROM runs WHERE id = ? AND deleted_at IS NULL`,
    )
    .get(input.runId) as RunRow | undefined;
  if (!existing) return null;

  const nextNote = input.note
    ? existing.note
      ? `${existing.note}\n${input.note}`
      : input.note
    : existing.note;

  db.prepare(
    `UPDATE runs SET ended_at = ?, status = ?, note = ? WHERE id = ?`,
  ).run(endedAt, input.status ?? "completed", nextNote, input.runId);

  const row = db
    .prepare(
      `SELECT id, started_at, ended_at, status, session_id, prompt_label, gpus, models, note
       FROM runs WHERE id = ?`,
    )
    .get(input.runId) as RunRow;
  return rowToRun(row);
}

export function listRuns(limit = 100): Run[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, started_at, ended_at, status, session_id, prompt_label, gpus, models, note
       FROM runs
       WHERE deleted_at IS NULL
       ORDER BY started_at DESC
       LIMIT ?`,
    )
    .all(Math.max(1, Math.min(500, limit))) as RunRow[];
  return rows.map(rowToRun);
}

export function getRun(runId: string): Run | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, started_at, ended_at, status, session_id, prompt_label, gpus, models, note
       FROM runs WHERE id = ? AND deleted_at IS NULL`,
    )
    .get(runId) as RunRow | undefined;
  return row ? rowToRun(row) : null;
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

export interface Progress {
  id: number;
  ts: string;
  runId: string;
  gpuId: string;
  model: string;
  useCase: string | null;
  tokPerSec: number | null;
  latencyMs: number | null;
  vramUsedMb: number | null;
  evalIdx: number | null;
  evalTotal: number | null;
}

interface ProgressRow {
  id: number;
  ts: number;
  run_id: string;
  gpu_id: string;
  model: string;
  use_case: string | null;
  tok_per_sec: number | null;
  latency_ms: number | null;
  vram_used_mb: number | null;
  eval_idx: number | null;
  eval_total: number | null;
}

function rowToProgress(row: ProgressRow): Progress {
  return {
    id: row.id,
    ts: new Date(row.ts).toISOString(),
    runId: row.run_id,
    gpuId: row.gpu_id,
    model: row.model,
    useCase: row.use_case,
    tokPerSec: row.tok_per_sec,
    latencyMs: row.latency_ms,
    vramUsedMb: row.vram_used_mb,
    evalIdx: row.eval_idx,
    evalTotal: row.eval_total,
  };
}

export interface InsertProgressInput {
  runId: string;
  gpuId: string;
  model: string;
  useCase?: string | null;
  tokPerSec?: number | null;
  latencyMs?: number | null;
  vramUsedMb?: number | null;
  evalIdx?: number | null;
  evalTotal?: number | null;
  ts?: number | string | Date;
}

export function insertProgress(input: InsertProgressInput): Progress {
  const db = getDb();
  const ts = toMillis(input.ts);
  const info = db
    .prepare(
      `INSERT INTO progress (ts, run_id, gpu_id, model, use_case, tok_per_sec, latency_ms, vram_used_mb, eval_idx, eval_total)
       VALUES (@ts, @run_id, @gpu_id, @model, @use_case, @tok_per_sec, @latency_ms, @vram_used_mb, @eval_idx, @eval_total)`,
    )
    .run({
      ts,
      run_id: input.runId,
      gpu_id: input.gpuId,
      model: input.model,
      use_case: input.useCase ?? null,
      tok_per_sec: input.tokPerSec ?? null,
      latency_ms: input.latencyMs ?? null,
      vram_used_mb: input.vramUsedMb ?? null,
      eval_idx: input.evalIdx ?? null,
      eval_total: input.evalTotal ?? null,
    });
  const row = db
    .prepare(
      `SELECT id, ts, run_id, gpu_id, model, use_case, tok_per_sec, latency_ms, vram_used_mb, eval_idx, eval_total
       FROM progress WHERE id = ?`,
    )
    .get(Number(info.lastInsertRowid)) as ProgressRow;
  return rowToProgress(row);
}

export function listProgressForRun(runId: string, limit = 5000): Progress[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, ts, run_id, gpu_id, model, use_case, tok_per_sec, latency_ms, vram_used_mb, eval_idx, eval_total
       FROM progress WHERE run_id = ? ORDER BY ts ASC LIMIT ?`,
    )
    .all(runId, Math.max(1, limit)) as ProgressRow[];
  return rows.map(rowToProgress);
}

// ---------------------------------------------------------------------------
// Scores
// ---------------------------------------------------------------------------

export interface Score {
  id: number;
  runId: string;
  gpuId: string;
  model: string;
  useCase: string;
  testCaseId: string | null;
  composite: number | null;
  dimensions: Record<string, unknown> | null;
  tokPerSec: number | null;
  recordedAt: string;
}

interface ScoreRow {
  id: number;
  run_id: string;
  gpu_id: string;
  model: string;
  use_case: string;
  test_case_id: string | null;
  composite: number | null;
  dimensions: string | null;
  tok_per_sec: number | null;
  recorded_at: number;
}

function rowToScore(row: ScoreRow): Score {
  let dims: Record<string, unknown> | null = null;
  if (row.dimensions) {
    try {
      dims = JSON.parse(row.dimensions) as Record<string, unknown>;
    } catch {
      dims = null;
    }
  }
  return {
    id: row.id,
    runId: row.run_id,
    gpuId: row.gpu_id,
    model: row.model,
    useCase: row.use_case,
    testCaseId: row.test_case_id,
    composite: row.composite,
    dimensions: dims,
    tokPerSec: row.tok_per_sec,
    recordedAt: new Date(row.recorded_at).toISOString(),
  };
}

export interface InsertScoreInput {
  runId: string;
  gpuId: string;
  model: string;
  useCase: string;
  testCaseId?: string | null;
  composite?: number | null;
  dimensions?: Record<string, unknown> | null;
  tokPerSec?: number | null;
  recordedAt?: number | string | Date;
}

export function insertScore(input: InsertScoreInput): Score {
  const db = getDb();
  const recordedAt = toMillis(input.recordedAt);
  const info = db
    .prepare(
      `INSERT INTO scores (run_id, gpu_id, model, use_case, test_case_id, composite, dimensions, tok_per_sec, recorded_at)
       VALUES (@run_id, @gpu_id, @model, @use_case, @test_case_id, @composite, @dimensions, @tok_per_sec, @recorded_at)`,
    )
    .run({
      run_id: input.runId,
      gpu_id: input.gpuId,
      model: input.model,
      use_case: input.useCase,
      test_case_id: input.testCaseId ?? null,
      composite: input.composite ?? null,
      dimensions:
        input.dimensions === undefined || input.dimensions === null
          ? null
          : JSON.stringify(input.dimensions),
      tok_per_sec: input.tokPerSec ?? null,
      recorded_at: recordedAt,
    });
  const row = db
    .prepare(
      `SELECT id, run_id, gpu_id, model, use_case, test_case_id, composite, dimensions, tok_per_sec, recorded_at
       FROM scores WHERE id = ?`,
    )
    .get(Number(info.lastInsertRowid)) as ScoreRow;
  return rowToScore(row);
}

export function listScoresForRun(runId: string): Score[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, run_id, gpu_id, model, use_case, test_case_id, composite, dimensions, tok_per_sec, recorded_at
       FROM scores WHERE run_id = ? ORDER BY recorded_at ASC`,
    )
    .all(runId) as ScoreRow[];
  return rows.map(rowToScore);
}

// ---------------------------------------------------------------------------
// Repo activity (GitHub webhook target)
// ---------------------------------------------------------------------------

export interface RepoActivity {
  id: number;
  ts: string;
  repo: string;
  kind: string;
  actor: string | null;
  ref: string | null;
  sha: string | null;
  title: string | null;
  url: string;
  summary: string | null;
  meta: Record<string, unknown>;
}

interface RepoActivityRow {
  id: number;
  ts: number;
  repo: string;
  kind: string;
  actor: string | null;
  ref: string | null;
  sha: string | null;
  title: string | null;
  url: string;
  summary: string | null;
  meta: string;
}

function rowToRepoActivity(row: RepoActivityRow): RepoActivity {
  let meta: Record<string, unknown> = {};
  try {
    meta = row.meta ? JSON.parse(row.meta) : {};
  } catch {
    meta = {};
  }
  return {
    id: row.id,
    ts: new Date(row.ts).toISOString(),
    repo: row.repo,
    kind: row.kind,
    actor: row.actor,
    ref: row.ref,
    sha: row.sha,
    title: row.title,
    url: row.url,
    summary: row.summary,
    meta,
  };
}

export interface InsertRepoActivityInput {
  repo: string;
  kind: string;
  url: string;
  actor?: string | null;
  ref?: string | null;
  sha?: string | null;
  title?: string | null;
  summary?: string | null;
  meta?: Record<string, unknown>;
  ts?: number | string | Date;
}

export function insertRepoActivity(
  input: InsertRepoActivityInput,
): RepoActivity {
  const db = getDb();
  const ts = toMillis(input.ts);
  const info = db
    .prepare(
      `INSERT INTO repo_activity (ts, repo, kind, actor, ref, sha, title, url, summary, meta)
       VALUES (@ts, @repo, @kind, @actor, @ref, @sha, @title, @url, @summary, @meta)`,
    )
    .run({
      ts,
      repo: input.repo,
      kind: input.kind,
      actor: input.actor ?? null,
      ref: input.ref ?? null,
      sha: input.sha ?? null,
      title: input.title ?? null,
      url: input.url,
      summary: input.summary ?? null,
      meta: JSON.stringify(input.meta ?? {}),
    });
  const row = db
    .prepare(
      `SELECT id, ts, repo, kind, actor, ref, sha, title, url, summary, meta
       FROM repo_activity WHERE id = ?`,
    )
    .get(Number(info.lastInsertRowid)) as RepoActivityRow;
  return rowToRepoActivity(row);
}

// ---------------------------------------------------------------------------
// Artifacts
// ---------------------------------------------------------------------------

export interface Artifact {
  id: number;
  ts: string;
  runId: string | null;
  sessionId: string | null;
  kind: string;
  label: string;
  url: string | null;
  bytes: number | null;
  sha256: string | null;
  meta: Record<string, unknown>;
}

interface ArtifactRow {
  id: number;
  ts: number;
  run_id: string | null;
  session_id: string | null;
  kind: string;
  label: string;
  url: string | null;
  bytes: number | null;
  sha256: string | null;
  meta: string;
}

function rowToArtifact(row: ArtifactRow): Artifact {
  let meta: Record<string, unknown> = {};
  try {
    meta = row.meta ? JSON.parse(row.meta) : {};
  } catch {
    meta = {};
  }
  return {
    id: row.id,
    ts: new Date(row.ts).toISOString(),
    runId: row.run_id,
    sessionId: row.session_id,
    kind: row.kind,
    label: row.label,
    url: row.url,
    bytes: row.bytes,
    sha256: row.sha256,
    meta,
  };
}

export interface InsertArtifactInput {
  kind: string;
  label: string;
  runId?: string | null;
  sessionId?: string | null;
  url?: string | null;
  bytes?: number | null;
  sha256?: string | null;
  meta?: Record<string, unknown>;
  ts?: number | string | Date;
}

export function insertArtifact(input: InsertArtifactInput): Artifact {
  const db = getDb();
  const ts = toMillis(input.ts);
  const info = db
    .prepare(
      `INSERT INTO artifacts (ts, run_id, session_id, kind, label, url, bytes, sha256, meta)
       VALUES (@ts, @run_id, @session_id, @kind, @label, @url, @bytes, @sha256, @meta)`,
    )
    .run({
      ts,
      run_id: input.runId ?? null,
      session_id: input.sessionId ?? null,
      kind: input.kind,
      label: input.label,
      url: input.url ?? null,
      bytes: input.bytes ?? null,
      sha256: input.sha256 ?? null,
      meta: JSON.stringify(input.meta ?? {}),
    });
  const row = db
    .prepare(
      `SELECT id, ts, run_id, session_id, kind, label, url, bytes, sha256, meta
       FROM artifacts WHERE id = ?`,
    )
    .get(Number(info.lastInsertRowid)) as ArtifactRow;
  return rowToArtifact(row);
}

// ---------------------------------------------------------------------------
// Human tasks — things the agent needs from the human (URLs, approvals,
// passwords, decisions). Posted via /api/ingest kind='human_task'.
// ---------------------------------------------------------------------------

export type HumanTaskStatus = "open" | "done" | "wontdo" | "blocked";
export type HumanTaskPriority = "low" | "normal" | "high" | "urgent";

export interface HumanTask {
  id: number;
  ts: string;
  sessionId: string;
  title: string;
  details: Record<string, unknown>;
  status: HumanTaskStatus;
  priority: HumanTaskPriority;
  url: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

interface HumanTaskRow {
  id: number;
  ts: number;
  session_id: string;
  title: string;
  details: string;
  status: HumanTaskStatus;
  priority: HumanTaskPriority;
  url: string | null;
  resolved_at: number | null;
  resolved_by: string | null;
}

function rowToHumanTask(row: HumanTaskRow): HumanTask {
  let details: Record<string, unknown> = {};
  try {
    details = row.details ? JSON.parse(row.details) : {};
  } catch {
    details = {};
  }
  return {
    id: row.id,
    ts: new Date(row.ts).toISOString(),
    sessionId: row.session_id,
    title: row.title,
    details,
    status: row.status,
    priority: row.priority,
    url: row.url,
    resolvedAt: row.resolved_at ? new Date(row.resolved_at).toISOString() : null,
    resolvedBy: row.resolved_by,
  };
}

export interface InsertHumanTaskInput {
  sessionId: string;
  title: string;
  details?: Record<string, unknown>;
  priority?: HumanTaskPriority;
  url?: string | null;
  ts?: number | string | Date;
}

export function insertHumanTask(input: InsertHumanTaskInput): HumanTask {
  const db = getDb();
  const ts = toMillis(input.ts);
  const info = db
    .prepare(
      `INSERT INTO human_tasks (ts, session_id, title, details, status, priority, url)
       VALUES (@ts, @session_id, @title, @details, 'open', @priority, @url)`,
    )
    .run({
      ts,
      session_id: input.sessionId,
      title: input.title,
      details: JSON.stringify(input.details ?? {}),
      priority: input.priority ?? "normal",
      url: input.url ?? null,
    });
  const row = db
    .prepare(
      `SELECT id, ts, session_id, title, details, status, priority, url,
              resolved_at, resolved_by
         FROM human_tasks WHERE id = ?`,
    )
    .get(Number(info.lastInsertRowid)) as HumanTaskRow;
  const task = rowToHumanTask(row);
  // Also emit an event so visitors see that a human task was filed.
  insertEvent({
    sessionId: input.sessionId,
    actor: "eidos",
    kind: "action",
    summary: `new human task: ${input.title}`,
    icon: "warn",
    details: { human_task_id: task.id, priority: task.priority },
  });
  return task;
}

export function listHumanTasks(opts: {
  status?: HumanTaskStatus | "all";
  limit?: number;
} = {}): HumanTask[] {
  const db = getDb();
  const limit = Math.max(1, Math.min(500, opts.limit ?? 100));
  const status = opts.status ?? "open";
  if (status === "all") {
    const rows = db
      .prepare(
        `SELECT id, ts, session_id, title, details, status, priority, url,
                resolved_at, resolved_by
           FROM human_tasks
          WHERE deleted_at IS NULL
          ORDER BY ts DESC
          LIMIT ?`,
      )
      .all(limit) as HumanTaskRow[];
    return rows.map(rowToHumanTask);
  }
  const rows = db
    .prepare(
      `SELECT id, ts, session_id, title, details, status, priority, url,
              resolved_at, resolved_by
         FROM human_tasks
        WHERE deleted_at IS NULL AND status = ?
        ORDER BY ts DESC
        LIMIT ?`,
    )
    .all(status, limit) as HumanTaskRow[];
  return rows.map(rowToHumanTask);
}

export function resolveHumanTask(
  id: number,
  status: HumanTaskStatus,
  resolvedBy: string | null = "human",
): HumanTask | null {
  if (status === "open") return null;
  const db = getDb();
  const resolvedAt = Date.now();
  db.prepare(
    `UPDATE human_tasks
        SET status = ?, resolved_at = ?, resolved_by = ?
      WHERE id = ? AND deleted_at IS NULL`,
  ).run(status, resolvedAt, resolvedBy, id);
  const row = db
    .prepare(
      `SELECT id, ts, session_id, title, details, status, priority, url,
              resolved_at, resolved_by
         FROM human_tasks WHERE id = ?`,
    )
    .get(id) as HumanTaskRow | undefined;
  if (!row) return null;
  const task = rowToHumanTask(row);
  insertEvent({
    sessionId: task.sessionId,
    actor: "human",
    kind: "milestone",
    summary: `human task resolved (${status}): ${task.title}`,
    icon: status === "done" ? "check" : "warn",
    details: { human_task_id: task.id, status, resolved_by: resolvedBy },
  });
  return task;
}

// ─────────────────────────── models registry ────────────────────────────

export interface ModelRow {
  name: string;
  family: string;
  generation: string | null;
  architecture: string | null;
  totalParamsB: number | null;
  activeParamsB: number | null;
  sizeGB: number | null;
  license: string | null;
  releasedAt: string | null;
  hardwareTarget: string | null;
  pulledOnH100: boolean;
  defaultInHarness: boolean;
  inRaceRotation: boolean;
  notes: string | null;
  updatedAt: string;
}

interface ModelDbRow {
  name: string;
  family: string;
  generation: string | null;
  architecture: string | null;
  total_params_b: number | null;
  active_params_b: number | null;
  size_gb: number | null;
  license: string | null;
  released_at: string | null;
  hardware_target: string | null;
  pulled_on_h100: number;
  default_in_harness: number;
  in_race_rotation: number;
  notes: string | null;
  updated_at: number;
}

function rowToModel(r: ModelDbRow): ModelRow {
  return {
    name: r.name,
    family: r.family,
    generation: r.generation,
    architecture: r.architecture,
    totalParamsB: r.total_params_b,
    activeParamsB: r.active_params_b,
    sizeGB: r.size_gb,
    license: r.license,
    releasedAt: r.released_at,
    hardwareTarget: r.hardware_target,
    pulledOnH100: !!r.pulled_on_h100,
    defaultInHarness: !!r.default_in_harness,
    inRaceRotation: !!r.in_race_rotation,
    notes: r.notes,
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

export function listModels(): ModelRow[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT name, family, generation, architecture,
              total_params_b, active_params_b, size_gb, license,
              released_at, hardware_target, pulled_on_h100,
              default_in_harness, in_race_rotation, notes, updated_at
         FROM models
        WHERE deleted_at IS NULL
        ORDER BY default_in_harness DESC,
                 pulled_on_h100 DESC,
                 family ASC,
                 CAST(generation AS REAL) DESC,
                 total_params_b DESC`,
    )
    .all() as ModelDbRow[];
  return rows.map(rowToModel);
}

export function humanTaskCounts(): { open: number; done: number; wontdo: number; blocked: number } {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT status, COUNT(*) AS c
         FROM human_tasks
        WHERE deleted_at IS NULL
        GROUP BY status`,
    )
    .all() as Array<{ status: HumanTaskStatus; c: number }>;
  const out = { open: 0, done: 0, wontdo: 0, blocked: 0 };
  for (const r of rows) out[r.status] = Number(r.c);
  return out;
}
