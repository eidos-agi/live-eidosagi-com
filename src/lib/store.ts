// SQLite-backed adapter matching the previous filesystem store's public API.
//
// Internally reads/writes to the same SQLite DB as `@/lib/db`. Return shapes
// are intentionally preserved so existing UI components don't have to change.
//
// Named `store.ts` for import compatibility; new code should prefer `@/lib/db`
// directly.

import {
  getDb,
  getRun,
  listRuns as listRunsDb,
  upsertRunStart,
  insertProgress as insertProgressDb,
  insertScore as insertScoreDb,
  listProgressForRun,
  listScoresForRun,
  type Run as DbRun,
  type Progress,
  type Score,
} from "./db";
import type { EvalScore, ProgressEvent, Run } from "./types";

function dbRunToLegacy(run: DbRun): Run {
  return {
    id: run.id,
    startedAt: run.startedAt,
    endedAt: run.endedAt,
    gpus: run.gpus.map((g) => {
      const loose = g as unknown as Record<string, unknown>;
      const pickNum = (...keys: string[]): number => {
        for (const k of keys) {
          const v = loose[k];
          if (typeof v === "number") return v;
        }
        return 0;
      };
      return {
        name: String(g.name),
        type: String(g.type ?? g.name),
        vramGB: pickNum("vramGB", "vram_gb"),
        costPerHour: pickNum("costPerHour", "cost_per_hour"),
      };
    }),
    models: run.models,
    label: run.promptLabel ?? undefined,
  };
}

function progressToLegacy(p: Progress): ProgressEvent {
  return {
    runId: p.runId,
    ts: p.ts,
    gpuId: p.gpuId,
    model: p.model,
    useCase: p.useCase ?? "",
    tokenPerSec: p.tokPerSec ?? 0,
    latencyMs: p.latencyMs ?? 0,
    vramUsedMB: p.vramUsedMb ?? 0,
    evalProgressIdx: p.evalIdx ?? 0,
    evalTotal: p.evalTotal ?? 0,
  };
}

function scoreToLegacy(s: Score): EvalScore {
  const d = s.dimensions ?? {};
  const num = (k: string): number => {
    const v = (d as Record<string, unknown>)[k];
    return typeof v === "number" ? v : 0;
  };
  return {
    runId: s.runId,
    model: s.model,
    useCase: s.useCase,
    testCaseId: s.testCaseId ?? "",
    composite: s.composite ?? 0,
    dimensions: {
      correctness: num("correctness"),
      completeness: num("completeness"),
      formatQuality: num("formatQuality") || num("format_quality"),
      conciseness: num("conciseness"),
    },
    tokPerSec: s.tokPerSec ?? 0,
  };
}

export async function readRunMeta(runId: string): Promise<Run | null> {
  const run = getRun(runId);
  return run ? dbRunToLegacy(run) : null;
}

export async function writeRunMeta(run: Run): Promise<void> {
  upsertRunStart({
    runId: run.id,
    gpus: run.gpus.map((g) => ({
      name: g.name,
      type: g.type,
      vramGB: g.vramGB,
      costPerHour: g.costPerHour,
    })),
    models: run.models,
    promptLabel: run.label ?? null,
    startedAt: run.startedAt,
    status: run.endedAt ? "completed" : "running",
  });
  if (run.endedAt) {
    const db = getDb();
    db.prepare(`UPDATE runs SET ended_at = ?, status = ? WHERE id = ?`).run(
      Date.parse(run.endedAt),
      "completed",
      run.id,
    );
  }
}

export async function listRuns(): Promise<Run[]> {
  return listRunsDb(500).map(dbRunToLegacy);
}

export async function appendProgress(ev: ProgressEvent): Promise<void> {
  insertProgressDb({
    runId: ev.runId,
    gpuId: ev.gpuId,
    model: ev.model,
    useCase: ev.useCase || null,
    tokPerSec: ev.tokenPerSec,
    latencyMs: ev.latencyMs,
    vramUsedMb: ev.vramUsedMB,
    evalIdx: ev.evalProgressIdx,
    evalTotal: ev.evalTotal,
    ts: ev.ts,
  });
}

export async function appendScore(score: EvalScore): Promise<void> {
  insertScoreDb({
    runId: score.runId,
    gpuId: "",
    model: score.model,
    useCase: score.useCase,
    testCaseId: score.testCaseId || null,
    composite: score.composite,
    dimensions: score.dimensions as unknown as Record<string, unknown>,
    tokPerSec: score.tokPerSec,
  });
}

export async function readEvents(runId: string): Promise<ProgressEvent[]> {
  return listProgressForRun(runId, 10000).map(progressToLegacy);
}

export async function readScores(runId: string): Promise<EvalScore[]> {
  return listScoresForRun(runId).map(scoreToLegacy);
}

/** Existence check used by the SSE route. */
export function runExistsSync(runId: string): boolean {
  return getRun(runId) != null;
}

/**
 * Kept for API compatibility with the previous filesystem store. Returns a
 * pseudo "path" that encodes the run id. The SSE route no longer tails this
 * file; it polls the `progress` table directly. Exported so legacy imports
 * don't blow up during compilation.
 */
export function eventsFilePath(runId: string): string {
  return `sqlite://progress?run_id=${encodeURIComponent(runId)}`;
}
