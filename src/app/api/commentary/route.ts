import { NextResponse } from "next/server";
import { getDb, listProgressForRun, listRuns } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One-line ticker copy. Rule-based, priority-ranked, rotated at the
// minute boundary so same-priority lines swap over time.

function relMin(ms: number): string {
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  return `${Math.floor(ms / 3_600_000)}h`;
}

function fmtUsd(n: number): string {
  if (n <= 0) return "$0";
  if (n < 0.1) return `$${n.toFixed(3)}`;
  if (n < 10) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(0)}`;
}

interface Line {
  text: string;
  priority: number;
}

export async function GET(): Promise<NextResponse> {
  const lines: Line[] = [];

  try {
    const db = getDb();
    const now = Date.now();
    const hourAgo = now - 60 * 60 * 1000;
    const dayAgo = now - 24 * 60 * 60 * 1000;

    // Newest race — winner, spread, model
    const runs = listRuns(10);
    const newestRace = runs.find((r) => r.id.startsWith("race-")) ?? runs[0];
    if (newestRace) {
      const progress = listProgressForRun(newestRace.id);
      const byGpu = new Map<string, number>();
      for (const p of progress) {
        if ((p.tokPerSec ?? 0) > 0) {
          byGpu.set(
            p.gpuId,
            Math.max(byGpu.get(p.gpuId) ?? 0, p.tokPerSec ?? 0),
          );
        }
      }
      if (byGpu.size >= 2) {
        const sorted = [...byGpu.entries()].sort((a, b) => b[1] - a[1]);
        const [win, slow] = [sorted[0], sorted[sorted.length - 1]];
        const spread = win[1] / (slow[1] || 1);
        const winLabel = win[0].replace(/^thunder-/, "").toUpperCase();
        const slowLabel = slow[0].replace(/^thunder-/, "").toUpperCase();
        const model = newestRace.models[0] ?? "the model";
        const ageMs = now - Date.parse(newestRace.startedAt);
        lines.push({
          text: `${winLabel} just posted ${win[1].toFixed(0)} tok/s on ${model} — ${spread.toFixed(1)}× faster than the ${slowLabel} lane (${relMin(ageMs)} ago).`,
          priority: 80,
        });
      }
    }

    // Savings / local share
    const byActorRows = db
      .prepare(
        `SELECT actor, COUNT(*) AS c FROM events
         WHERE deleted_at IS NULL AND ts >= ? GROUP BY actor`,
      )
      .all(dayAgo) as Array<{ actor: string; c: number }>;
    const HOSTED = new Set(["eidos", "claude"]);
    const EXCLUDED = new Set(["human"]);
    let hosted = 0;
    let local = 0;
    for (const r of byActorRows) {
      if (EXCLUDED.has(r.actor)) continue;
      if (HOSTED.has(r.actor)) hosted += r.c;
      else local += r.c;
    }
    const denom = hosted + local;
    if (denom > 0) {
      const share = local / denom;
      const pct = Math.round(share * 100);
      const cost = Number.parseFloat(
        process.env.CLAUDE_EVENT_COST_USD ?? "0.004",
      );
      const saved = local * cost;
      if (share >= 0.5) {
        lines.push({
          text: `Local silicon has authored ${pct}% of today's events — ${fmtUsd(saved)} saved. The flywheel is turning.`,
          priority: share >= 0.8 ? 90 : 70,
        });
      } else if (share > 0) {
        lines.push({
          text: `Local narration at ${pct}% and climbing. ${fmtUsd(saved)} saved so far; goal is 90%.`,
          priority: 60,
        });
      }
    }

    // Narrator freshness (stale = high priority bad news)
    const narratorLatestRow = db
      .prepare(
        `SELECT MAX(ts) AS t FROM events
         WHERE deleted_at IS NULL AND actor = 'eidos-local'`,
      )
      .get() as { t: number | null };
    if (narratorLatestRow.t) {
      const ageMs = now - Number(narratorLatestRow.t);
      if (ageMs > 5 * 60_000) {
        lines.push({
          text: `A6000 narrator has been quiet for ${relMin(ageMs)}. It may be reloading a model.`,
          priority: 85,
        });
      }
    }

    // Event rate
    const lastHourRow = db
      .prepare(
        `SELECT COUNT(*) AS c FROM events
         WHERE deleted_at IS NULL AND ts >= ?`,
      )
      .get(hourAgo) as { c: number };
    if (lastHourRow.c > 0) {
      lines.push({
        text: `${lastHourRow.c} events in the last hour — commits, benchmarks, agent narration all flowing.`,
        priority: 40,
      });
    }

    // Runs cadence
    const runCountRow = db
      .prepare(
        `SELECT COUNT(*) AS c FROM runs
         WHERE deleted_at IS NULL AND started_at >= ?`,
      )
      .get(hourAgo) as { c: number };
    if (runCountRow.c > 1) {
      lines.push({
        text: `${runCountRow.c} cross-GPU races completed in the last hour. The live-racer is hot.`,
        priority: 50,
      });
    }
  } catch {
    // fall through to empty-state line
  }

  if (lines.length === 0) {
    return NextResponse.json(
      { line: "Silicon cooling. Next ignition soon." },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  lines.sort((a, b) => b.priority - a.priority);
  const top = lines[0].priority;
  const contenders = lines.filter((l) => l.priority === top);
  const bucket = Math.floor(Date.now() / 60_000) % contenders.length;
  return NextResponse.json(
    { line: contenders[bucket].text },
    { headers: { "Cache-Control": "no-store" } },
  );
}
