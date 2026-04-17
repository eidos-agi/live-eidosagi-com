// Server-side wrapper for Commentator: computes the first line from
// SQLite so the initial paint shows real narration instead of the
// 'Silicon cooling' fallback.

import {
  getDb,
  listProgressForRun,
  listRuns,
} from "@/lib/db";
import Commentator from "./Commentator";

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

function computeInitialLine(): string | undefined {
  const lines: Array<{ text: string; priority: number }> = [];
  try {
    const db = getDb();
    const now = Date.now();
    const hourAgo = now - 60 * 60 * 1000;
    const dayAgo = now - 24 * 60 * 60 * 1000;

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
      }
    }

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
    return undefined;
  }
  if (lines.length === 0) return undefined;
  lines.sort((a, b) => b.priority - a.priority);
  return lines[0].text;
}

export default function CommentatorServer() {
  const initial = computeInitialLine();
  return <Commentator initial={initial} />;
}
