// Server-rendered wrapper that seeds SavingsStrip with live DB values on
// first paint — prevents the "waiting for first event" flash when the
// DB actually has plenty of events.

import { humanTaskCounts as _unused } from "@/lib/db"; // keeps db module hot
import { getDb } from "@/lib/db";
import SavingsStrip from "./SavingsStrip";

void _unused;

const WINDOW_HOURS = 24;

interface Seed {
  local_share: number;
  total_events: number;
  local_event_count: number;
  hosted_event_count: number;
  usd_saved_estimate: number;
  hosted_cost_incurred_usd: number;
  last_benchmark_ts: number | null;
}

function readClaudeCost(): number {
  const raw = process.env.CLAUDE_EVENT_COST_USD;
  if (!raw) return 0.004;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0.004;
}

function computeSeed(): Seed | null {
  try {
    const db = getDb();
    const since = Date.now() - WINDOW_HOURS * 60 * 60 * 1000;
    const rows = db
      .prepare(
        `SELECT actor, COUNT(*) AS c
           FROM events
          WHERE deleted_at IS NULL AND ts >= ?
          GROUP BY actor`,
      )
      .all(since) as Array<{ actor: string; c: number }>;
    const HOSTED = new Set(["eidos", "claude"]);
    const EXCLUDED = new Set(["human"]);
    let hosted = 0, local = 0, total = 0;
    for (const r of rows) {
      total += r.c;
      if (EXCLUDED.has(r.actor)) continue;
      if (HOSTED.has(r.actor)) hosted += r.c;
      else local += r.c;
    }
    const denom = hosted + local;
    const share = denom > 0 ? local / denom : 0;
    const cost = readClaudeCost();
    const round4 = (n: number) => Math.round(n * 10_000) / 10_000;

    // Most recent benchmark event — powers the "stale · last race Nm ago"
    // badge when live-racer has stopped landing data.
    const lastRow = db
      .prepare(
        `SELECT ts FROM events
          WHERE deleted_at IS NULL AND actor = 'benchmark'
          ORDER BY ts DESC LIMIT 1`,
      )
      .get() as { ts: number } | undefined;

    return {
      local_share: share,
      total_events: total,
      local_event_count: local,
      hosted_event_count: hosted,
      usd_saved_estimate: round4(local * cost),
      hosted_cost_incurred_usd: round4(hosted * cost),
      last_benchmark_ts: lastRow ? Number(lastRow.ts) : null,
    };
  } catch {
    return null;
  }
}

export default function SavingsStripServer() {
  const seed = computeSeed();
  return <SavingsStrip initialSeed={seed ?? undefined} />;
}
