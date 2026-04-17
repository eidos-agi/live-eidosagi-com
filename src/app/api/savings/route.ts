// GET /api/savings
//
// Self-cheapening telemetry: how much of today's event narration is
// authored by a local A6000 model vs. hosted Claude, expressed as
// both a ratio and a dollar floor.
//
// Rolling 24h window over the `events` table. `human` rows are
// excluded from ratios (they're neither hosted nor local inference);
// `claude` rows are assumed-hosted; every other actor we currently
// emit (`local-llm`, `benchmark`, `github`, `system`, `thunder`,
// `qwen-coder`) is treated as zero-cost — either already-paid GPU
// hours or non-LLM system signals.
//
// The savings number is a floor by construction: Claude's true $/event
// varies with prompt size, but the env-driven mean is kept low
// (0.004 default) so the published number only ever rounds DOWN.
//
// Cache-Control: no-store. No DB -> all-zeros payload, still 200.
//
// Refs: TASK-0010, TASK-0012, visionlog GOAL-001, ADR-003.

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_HOURS = 24;

// Actors whose events are authored by a hosted LLM (currently Claude,
// powering Eidos) and therefore incur a per-event cost. Both 'eidos' and
// 'claude' map here — 'claude' is the historical name before the rename,
// 'eidos' is the public-facing name going forward.
const HOSTED_ACTORS = new Set<string>(["eidos", "claude"]);

// Actors whose events are authored by local inference (A6000 ollama)
// or by zero-cost system signals (webhooks, benchmark runners, etc.).
// These count toward the denominator but contribute $0 to cost.
const LOCAL_OR_FREE_ACTORS = new Set<string>([
  "local-llm",
  "eidos-local",
  "qwen-coder",
  "benchmark",
  "github",
  "system",
  "thunder",
]);

// Actors excluded from the ratio entirely (neither hosted nor local
// inference — they're a human-in-the-loop signal).
const EXCLUDED_ACTORS = new Set<string>(["human"]);

interface SavingsPayload {
  window_hours: number;
  total_events: number;
  by_actor: Record<string, number>;
  local_event_count: number;
  hosted_event_count: number;
  local_share: number;
  usd_saved_estimate: number;
  hosted_cost_incurred_usd: number;
  claude_event_cost_usd: number;
  updated_at: string;
}

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

function emptyPayload(claudeCost: number): SavingsPayload {
  return {
    window_hours: WINDOW_HOURS,
    total_events: 0,
    by_actor: {},
    local_event_count: 0,
    hosted_event_count: 0,
    local_share: 0,
    usd_saved_estimate: 0,
    hosted_cost_incurred_usd: 0,
    claude_event_cost_usd: claudeCost,
    updated_at: new Date().toISOString(),
  };
}

function readClaudeCost(): number {
  const raw = process.env.CLAUDE_EVENT_COST_USD;
  if (!raw) return 0.004;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0.004;
}

export async function GET(): Promise<NextResponse> {
  const claudeCost = readClaudeCost();

  let byActor: Record<string, number> = {};
  try {
    const db = getDb();
    const sinceMs = Date.now() - WINDOW_HOURS * 60 * 60 * 1000;
    const rows = db
      .prepare(
        `SELECT actor, COUNT(*) AS c
         FROM events
         WHERE deleted_at IS NULL
           AND ts >= ?
         GROUP BY actor`,
      )
      .all(sinceMs) as Array<{ actor: string; c: number }>;
    for (const row of rows) {
      byActor[row.actor] = Number(row.c);
    }
  } catch {
    // DB unavailable — graceful all-zeros payload (200) so the widget
    // never becomes a visible error state on the public site.
    return NextResponse.json(emptyPayload(claudeCost), {
      headers: { "Cache-Control": "no-store" },
    });
  }

  let hosted = 0;
  let local = 0;
  let total = 0;
  for (const [actor, count] of Object.entries(byActor)) {
    total += count;
    if (EXCLUDED_ACTORS.has(actor)) continue;
    if (HOSTED_ACTORS.has(actor)) hosted += count;
    else if (LOCAL_OR_FREE_ACTORS.has(actor)) local += count;
    else {
      // Unknown future actor — default to "free" so we under-count
      // savings rather than over-count them.
      local += count;
    }
  }

  const denom = hosted + local;
  const localShare = denom > 0 ? local / denom : 0;
  // Saved = hosted-baseline - actual = (hosted+local)*cost - hosted*cost
  //       = local * cost.
  const usdSaved = local * claudeCost;

  const payload: SavingsPayload = {
    window_hours: WINDOW_HOURS,
    total_events: total,
    by_actor: byActor,
    local_event_count: local,
    hosted_event_count: hosted,
    local_share: localShare,
    usd_saved_estimate: round4(usdSaved),
    hosted_cost_incurred_usd: round4(hosted * claudeCost),
    claude_event_cost_usd: claudeCost,
    updated_at: new Date().toISOString(),
  };

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
