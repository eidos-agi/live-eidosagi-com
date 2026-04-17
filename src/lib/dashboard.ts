// Dashboard aggregation — one SQLite read, many stats.
// Server-side only. No client leakage of DB handles.

import { getDb, humanTaskCounts } from "./db";

export interface DashboardStats {
  events: {
    total: number;
    last_hour: number;
    by_actor: Record<string, number>;
  };
  savings: {
    local_share: number;
    usd_saved: number;
    usd_incurred: number;
    claude_event_cost_usd: number;
    local_event_count: number;
    hosted_event_count: number;
  };
  runs: {
    total: number;
    newest_started_at: string | null;
    newest_age_minutes: number | null;
  };
  chat: {
    total_messages: number;
    messages_last_hour: number;
    distinct_handles_last_hour: number;
  };
  human_tasks: {
    open: number;
    done: number;
    wontdo: number;
    blocked: number;
  };
  narrator: {
    last_event_ts: string | null;
    ticks_last_hour: number;
    total_local_events: number;
  };
  updated_at: string;
}

function readCost(): number {
  const raw = process.env.CLAUDE_EVENT_COST_USD;
  if (!raw) return 0.004;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0.004;
}

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

export function loadDashboardStats(): DashboardStats {
  const updatedAt = new Date().toISOString();
  const hostedActors = new Set(["eidos", "claude"]);
  const excluded = new Set(["human"]);
  const cost = readCost();

  const empty: DashboardStats = {
    events: { total: 0, last_hour: 0, by_actor: {} },
    savings: {
      local_share: 0,
      usd_saved: 0,
      usd_incurred: 0,
      claude_event_cost_usd: cost,
      local_event_count: 0,
      hosted_event_count: 0,
    },
    runs: { total: 0, newest_started_at: null, newest_age_minutes: null },
    chat: {
      total_messages: 0,
      messages_last_hour: 0,
      distinct_handles_last_hour: 0,
    },
    human_tasks: { open: 0, done: 0, wontdo: 0, blocked: 0 },
    narrator: {
      last_event_ts: null,
      ticks_last_hour: 0,
      total_local_events: 0,
    },
    updated_at: updatedAt,
  };

  let db;
  try {
    db = getDb();
  } catch {
    return empty;
  }

  const now = Date.now();
  const hourAgo = now - 60 * 60 * 1000;
  const dayAgo = now - 24 * 60 * 60 * 1000;

  // Events — breakdown by actor (24h window) + hourly rate.
  const byActorRows = db
    .prepare(
      `SELECT actor, COUNT(*) AS c FROM events
       WHERE deleted_at IS NULL AND ts >= ? GROUP BY actor`,
    )
    .all(dayAgo) as Array<{ actor: string; c: number }>;
  const byActor: Record<string, number> = {};
  let hosted = 0;
  let local = 0;
  let totalEvents = 0;
  for (const r of byActorRows) {
    byActor[r.actor] = Number(r.c);
    totalEvents += Number(r.c);
    if (excluded.has(r.actor)) continue;
    if (hostedActors.has(r.actor)) hosted += Number(r.c);
    else local += Number(r.c);
  }
  const denom = hosted + local;
  const localShare = denom > 0 ? local / denom : 0;

  const lastHourEvents = Number(
    (
      db
        .prepare(
          `SELECT COUNT(*) AS c FROM events
           WHERE deleted_at IS NULL AND ts >= ?`,
        )
        .get(hourAgo) as { c: number }
    ).c ?? 0,
  );

  // Narrator
  const narratorLastRow = db
    .prepare(
      `SELECT ts FROM events
       WHERE deleted_at IS NULL AND actor = 'eidos-local'
       ORDER BY ts DESC LIMIT 1`,
    )
    .get() as { ts: number } | undefined;
  const narratorTicksLastHour = Number(
    (
      db
        .prepare(
          `SELECT COUNT(*) AS c FROM events
           WHERE deleted_at IS NULL AND actor = 'eidos-local' AND ts >= ?`,
        )
        .get(hourAgo) as { c: number }
    ).c ?? 0,
  );
  const totalLocalEvents = Number(
    (
      db
        .prepare(
          `SELECT COUNT(*) AS c FROM events
           WHERE deleted_at IS NULL AND actor = 'eidos-local'`,
        )
        .get() as { c: number }
    ).c ?? 0,
  );

  // Runs
  const runsRow = db
    .prepare(
      `SELECT COUNT(*) AS c, MAX(started_at) AS newest FROM runs
       WHERE deleted_at IS NULL`,
    )
    .get() as { c: number; newest: number | null };
  const newestStarted = runsRow.newest
    ? new Date(Number(runsRow.newest)).toISOString()
    : null;
  const newestAgeMin = runsRow.newest
    ? Math.round((now - Number(runsRow.newest)) / 60_000)
    : null;

  // Chat
  const chatTotalRow = db
    .prepare(
      `SELECT COUNT(*) AS c FROM chat_messages WHERE deleted_at IS NULL`,
    )
    .get() as { c: number };
  const chatHourRows = db
    .prepare(
      `SELECT handle FROM chat_messages
       WHERE deleted_at IS NULL AND ts >= ?`,
    )
    .all(hourAgo) as Array<{ handle: string }>;
  const distinctHandles = new Set(chatHourRows.map((r) => r.handle));

  // Human tasks
  const taskCounts = humanTaskCounts();

  return {
    events: { total: totalEvents, last_hour: lastHourEvents, by_actor: byActor },
    savings: {
      local_share: Math.round(localShare * 10_000) / 10_000,
      usd_saved: round4(local * cost),
      usd_incurred: round4(hosted * cost),
      claude_event_cost_usd: cost,
      local_event_count: local,
      hosted_event_count: hosted,
    },
    runs: {
      total: Number(runsRow.c) || 0,
      newest_started_at: newestStarted,
      newest_age_minutes: newestAgeMin,
    },
    chat: {
      total_messages: Number(chatTotalRow.c) || 0,
      messages_last_hour: chatHourRows.length,
      distinct_handles_last_hour: distinctHandles.size,
    },
    human_tasks: taskCounts,
    narrator: {
      last_event_ts: narratorLastRow
        ? new Date(Number(narratorLastRow.ts)).toISOString()
        : null,
      ticks_last_hour: narratorTicksLastHour,
      total_local_events: totalLocalEvents,
    },
    updated_at: updatedAt,
  };
}
