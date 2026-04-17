// Chat storage + pub/sub for the public chat sidebar.
//
// Storage: shares the canonical SQLite DB from src/lib/db.ts
// (same file on the Railway volume, same migration runner). The
// chat_messages table is created by migration 002_chat.sql.
//
// An in-memory fallback is still kept for dev when the DB is
// unavailable (never hit in prod).

import crypto from "node:crypto";
import { getDb as getCanonicalDb } from "./db";

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
  __eidosChatMem?: ChatRow[];
  __eidosChatSubs?: Set<(msg: ChatMessage) => void>;
}

type SqliteDb = ReturnType<typeof getCanonicalDb>;

function prepareSql(
  db: SqliteDb,
  sql: string,
): {
  run: (...args: unknown[]) => { lastInsertRowid: number | bigint };
  all: (...args: unknown[]) => unknown[];
} {
  return db.prepare(sql) as unknown as {
    run: (...args: unknown[]) => { lastInsertRowid: number | bigint };
    all: (...args: unknown[]) => unknown[];
  };
}

function getDb(): SqliteDb | null {
  try {
    // Canonical DB runs all src/lib/migrations/*.sql including 002_chat.sql,
    // so the chat_messages table is guaranteed to exist.
    return getCanonicalDb();
  } catch (err) {
    console.warn(
      "[chat] canonical DB unavailable, using in-memory store:",
      err instanceof Error ? err.message : err,
    );
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
