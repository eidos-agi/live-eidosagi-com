// Chat storage + pub/sub for the public chat sidebar.
//
// Storage strategy:
//   - Primary: better-sqlite3 (shared with the SQLite branch).
//   - Fallback: in-memory array (dev / when the SQLite branch hasn't merged yet).
//
// The better-sqlite3 import is wrapped in a try/catch + dynamic require so
// the Next.js build still passes on this branch before 001_init.sql /
// better-sqlite3 land in main.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

export interface ChatMessage {
  id: number;
  ts: number;           // epoch ms
  handle: string;
  body: string;
  deleted: boolean;     // derived from deleted_at
}

interface ChatRow {
  id: number;
  ts: number;
  handle: string;
  body: string;
  ip_hash: string | null;
  deleted_at: number | null;
}

// ----------------------------------------------------------------------------
// SQLite connection (lazy, optional)
// ----------------------------------------------------------------------------

interface DbHolder {
  __eidosChatDb?: unknown | null;
  __eidosChatDbTried?: boolean;
  __eidosChatMem?: ChatRow[];
  __eidosChatSubs?: Set<(msg: ChatMessage) => void>;
}

type SqliteDb = Record<string, (...args: unknown[]) => unknown>;

function runSql(db: SqliteDb, sql: string): void {
  (db["exec"] as (s: string) => void)(sql);
}
function prepareSql(
  db: SqliteDb,
  sql: string,
): {
  run: (...args: unknown[]) => { lastInsertRowid: number | bigint };
  all: (...args: unknown[]) => unknown[];
} {
  return (db["prepare"] as (s: string) => {
    run: (...args: unknown[]) => { lastInsertRowid: number | bigint };
    all: (...args: unknown[]) => unknown[];
  })(sql);
}
function pragma(db: SqliteDb, sql: string): void {
  (db["pragma"] as (s: string) => unknown)(sql);
}

function resolveDbPath(): string {
  const explicit = process.env.DATABASE_PATH ?? process.env.SQLITE_PATH;
  if (explicit) {
    try {
      fs.mkdirSync(path.dirname(explicit), { recursive: true });
    } catch {
      // ignore
    }
    return explicit;
  }
  const dataDir = path.join(process.cwd(), "data");
  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch {
    // ignore
  }
  return path.join(dataDir, "eidos-live.sqlite");
}

function getDb(): SqliteDb | null {
  const holder = globalThis as unknown as DbHolder;
  if (holder.__eidosChatDb !== undefined) {
    return (holder.__eidosChatDb as SqliteDb) ?? null;
  }
  holder.__eidosChatDbTried = true;

  try {
    // createRequire + an opaque module name so the Next build succeeds
    // on branches where better-sqlite3 hasn't been installed yet. Webpack
    // emits an informational warning about the expression dependency —
    // that's expected; the build still passes.
    const req = createRequire(import.meta.url);
    const modName = ["better", "sqlite3"].join("-");
    const Database = req(modName) as new (
      filename: string,
      options?: Record<string, unknown>,
    ) => SqliteDb;
    const db = new Database(resolveDbPath());
    pragma(db, "journal_mode = WAL");

    const migrationPath = path.join(
      process.cwd(),
      "src",
      "lib",
      "migrations",
      "002_chat.sql",
    );
    if (fs.existsSync(migrationPath)) {
      const sql = fs.readFileSync(migrationPath, "utf8");
      runSql(db, sql);
    } else {
      runSql(
        db,
        `CREATE TABLE IF NOT EXISTS chat_messages (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           ts INTEGER NOT NULL,
           handle TEXT NOT NULL,
           body TEXT NOT NULL,
           ip_hash TEXT,
           deleted_at INTEGER
         );
         CREATE INDEX IF NOT EXISTS chat_messages_ts ON chat_messages(ts DESC);`,
      );
    }

    holder.__eidosChatDb = db;
    return db;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      "[chat] better-sqlite3 unavailable, using in-memory store:",
      err instanceof Error ? err.message : err,
    );
    holder.__eidosChatDb = null;
    return null;
  }
}

function memStore(): ChatRow[] {
  const holder = globalThis as unknown as DbHolder;
  if (!holder.__eidosChatMem) holder.__eidosChatMem = [];
  return holder.__eidosChatMem;
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

function rowToMessage(row: ChatRow): ChatMessage {
  return {
    id: Number(row.id),
    ts: Number(row.ts),
    handle: row.handle,
    body: row.body,
    deleted: row.deleted_at != null,
  };
}

export function listMessages(limit = 200): ChatMessage[] {
  const cap = Math.max(1, Math.min(500, limit));
  const db = getDb();
  if (db) {
    try {
      const rows = prepareSql(
        db,
        `SELECT id, ts, handle, body, ip_hash, deleted_at
         FROM chat_messages
         WHERE deleted_at IS NULL
         ORDER BY ts DESC
         LIMIT ?`,
      ).all(cap) as ChatRow[];
      return rows.map(rowToMessage);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        "[chat] listMessages failed:",
        err instanceof Error ? err.message : err,
      );
      return [];
    }
  }
  const rows = memStore()
    .filter((r) => r.deleted_at == null)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, cap);
  return rows.map(rowToMessage);
}

export interface InsertArgs {
  handle: string;
  body: string;
  ipHash: string | null;
  deletedAt?: number | null;
}

export function insertMessage(args: InsertArgs): ChatMessage {
  const ts = Date.now();
  const db = getDb();
  let id: number;

  if (db) {
    try {
      const res = prepareSql(
        db,
        `INSERT INTO chat_messages (ts, handle, body, ip_hash, deleted_at)
         VALUES (?, ?, ?, ?, ?)`,
      ).run(ts, args.handle, args.body, args.ipHash, args.deletedAt ?? null);
      id = Number(res.lastInsertRowid);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        "[chat] insertMessage failed, falling back to memory:",
        err instanceof Error ? err.message : err,
      );
      id = memInsert(ts, args);
    }
  } else {
    id = memInsert(ts, args);
  }

  const msg: ChatMessage = {
    id,
    ts,
    handle: args.handle,
    body: args.body,
    deleted: args.deletedAt != null,
  };
  broadcast(msg);
  return msg;
}

function memInsert(ts: number, args: InsertArgs): number {
  const store = memStore();
  const id = store.length > 0 ? store[store.length - 1].id + 1 : 1;
  store.push({
    id,
    ts,
    handle: args.handle,
    body: args.body,
    ip_hash: args.ipHash,
    deleted_at: args.deletedAt ?? null,
  });
  return id;
}

// ----------------------------------------------------------------------------
// IP hashing
// ----------------------------------------------------------------------------

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const salt = process.env.CHAT_IP_SALT ?? "eidos-dev-salt";
  return crypto.createHash("sha256").update(`${ip}:${salt}`).digest("hex");
}

// ----------------------------------------------------------------------------
// Rate limit (per IP, in-memory sliding window)
// ----------------------------------------------------------------------------

interface RateHolder {
  __eidosChatRate?: Map<string, number[]>;
}
const RATE_WINDOW_MS = 60_000;
const RATE_MIN_GAP_MS = 5_000;  // 1 msg / 5s / IP

export function checkRateLimit(ipHash: string | null): {
  ok: boolean;
  retryAfterMs: number;
} {
  const holder = globalThis as unknown as RateHolder;
  if (!holder.__eidosChatRate) holder.__eidosChatRate = new Map();
  const key = ipHash ?? "anon";
  const now = Date.now();
  const hits = holder.__eidosChatRate.get(key) ?? [];
  const recent = hits.filter((t) => now - t < RATE_WINDOW_MS);
  const last = recent[recent.length - 1];
  if (last && now - last < RATE_MIN_GAP_MS) {
    return { ok: false, retryAfterMs: RATE_MIN_GAP_MS - (now - last) };
  }
  recent.push(now);
  holder.__eidosChatRate.set(key, recent);
  return { ok: true, retryAfterMs: 0 };
}

// ----------------------------------------------------------------------------
// SSE pub/sub
// ----------------------------------------------------------------------------

export function subscribe(fn: (msg: ChatMessage) => void): () => void {
  const holder = globalThis as unknown as DbHolder;
  if (!holder.__eidosChatSubs) holder.__eidosChatSubs = new Set();
  holder.__eidosChatSubs.add(fn);
  return () => {
    holder.__eidosChatSubs?.delete(fn);
  };
}

function broadcast(msg: ChatMessage) {
  const holder = globalThis as unknown as DbHolder;
  const subs = holder.__eidosChatSubs;
  if (!subs) return;
  for (const fn of subs) {
    try {
      fn(msg);
    } catch {
      // ignore subscriber errors
    }
  }
}

// ----------------------------------------------------------------------------
// Validation
// ----------------------------------------------------------------------------

export const BODY_MAX = 200;
export const HANDLE_MAX = 32;

export function normalizeHandle(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().slice(0, HANDLE_MAX);
  if (!trimmed) return null;
  return trimmed.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

export function normalizeBody(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, BODY_MAX);
}
