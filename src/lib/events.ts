// Postgres-backed event feed for the Activity Stream.
//
// Schema (sister repo /eidos-live-mcp/migrations/001_init.sql):
//   events(id, ts, session_id, actor, kind, summary, details, icon, related_run, deleted_at)
//
// Design notes:
// - Single pg Pool cached on globalThis so Next.js hot-reload + per-lambda
//   reuse don't leak connections.
// - If DATABASE_URL is unset, all reads return [] — the UI should render
//   empty states gracefully rather than error.
// - Respects soft deletes (WHERE deleted_at IS NULL).
// - Public read, no auth.

import { Pool, type QueryResult } from "pg";

export interface ActivityEvent {
  id: number;
  ts: string;              // ISO timestamp
  sessionId: string;
  actor: string;           // 'claude' | 'human' | 'system' | ...
  kind: string;            // 'action' | 'decision' | 'observation' | 'milestone'
  summary: string;
  details: Record<string, unknown>;
  icon: string | null;
  relatedRun: string | null;
}

interface PoolHolder {
  __eidosLiveEventsPool?: Pool | null;
}

function getPool(): Pool | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;

  const holder = globalThis as unknown as PoolHolder;
  if (holder.__eidosLiveEventsPool) return holder.__eidosLiveEventsPool;

  const pool = new Pool({
    connectionString: url,
    max: 3,
    idleTimeoutMillis: 30_000,
    // Supabase/Neon typically require SSL; allow overriding via env
    ssl:
      process.env.DATABASE_SSL === "false"
        ? undefined
        : { rejectUnauthorized: false },
  });
  pool.on("error", (err) => {
    // Log but don't crash the process — lambda-friendly behaviour.
    // eslint-disable-next-line no-console
    console.error("[events] pg pool error:", err.message);
  });
  holder.__eidosLiveEventsPool = pool;
  return pool;
}

interface EventRow {
  id: string | number;
  ts: Date | string;
  session_id: string;
  actor: string;
  kind: string;
  summary: string;
  details: Record<string, unknown> | null;
  icon: string | null;
  related_run: string | null;
}

function rowToEvent(row: EventRow): ActivityEvent {
  return {
    id: typeof row.id === "string" ? Number(row.id) : row.id,
    ts: row.ts instanceof Date ? row.ts.toISOString() : String(row.ts),
    sessionId: row.session_id,
    actor: row.actor,
    kind: row.kind,
    summary: row.summary,
    details: row.details ?? {},
    icon: row.icon,
    relatedRun: row.related_run,
  };
}

export interface ListEventsOpts {
  limit?: number;
  sessionId?: string | null;
}

export async function listEvents(opts: ListEventsOpts = {}): Promise<ActivityEvent[]> {
  const pool = getPool();
  if (!pool) return [];

  const limit = Math.max(1, Math.min(500, opts.limit ?? 50));
  const params: Array<string | number> = [];
  let where = "deleted_at IS NULL";
  if (opts.sessionId) {
    params.push(opts.sessionId);
    where += ` AND session_id = $${params.length}`;
  }
  params.push(limit);
  const sql = `
    SELECT id, ts, session_id, actor, kind, summary, details, icon, related_run
    FROM events
    WHERE ${where}
    ORDER BY ts DESC
    LIMIT $${params.length}
  `;

  try {
    const result: QueryResult<EventRow> = await pool.query(sql, params);
    return result.rows.map(rowToEvent);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      "[events] listEvents failed:",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}
