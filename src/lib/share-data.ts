// Shared helper: derive podium + headline numbers for a completed (or live) run.
// Used by both the share-card (OG image) endpoint and the per-run narrative.

import {
  getRun,
  listProgressForRun,
  listScoresForRun,
} from "./db";
import type { EvalScore, ProgressEvent, Run } from "./types";

export interface PodiumEntry {
  gpuId: string;
  type: string;
  maxTps: number;
  avgTps: number;
  costPerHour: number;
  /** Cost per million tokens = costPerHour / (avgTps * 3600) * 1e6. */
  dollarsPerMillionTokens: number | null;
}

export interface ShareData {
  run: Run;
  events: ProgressEvent[];
  scores: EvalScore[];
  podium: PodiumEntry[];
  headlineTps: number | null;
  headlineGpu: string | null;
  model: string | null;
}

function deriveModel(run: Run, events: ProgressEvent[]): string | null {
  if (run.models.length > 0) return run.models[0];
  if (events.length > 0) return events[0].model;
  return null;
}

export function buildPodium(run: Run, events: ProgressEvent[]): PodiumEntry[] {
  const byGpu = new Map<string, { vals: number[]; cfg: Run["gpus"][number] }>();
  for (const gpu of run.gpus) byGpu.set(gpu.name, { vals: [], cfg: gpu });
  for (const ev of events) {
    const bucket = byGpu.get(ev.gpuId);
    if (!bucket) continue;
    bucket.vals.push(ev.tokenPerSec);
  }
  const entries: PodiumEntry[] = [];
  for (const [gpuId, { vals, cfg }] of byGpu) {
    if (vals.length === 0) {
      entries.push({
        gpuId,
        type: cfg.type,
        maxTps: 0,
        avgTps: 0,
        costPerHour: cfg.costPerHour,
        dollarsPerMillionTokens: null,
      });
      continue;
    }
    const max = Math.max(...vals);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const dpm =
      avg > 0 ? (cfg.costPerHour / (avg * 3600)) * 1_000_000 : null;
    entries.push({
      gpuId,
      type: cfg.type,
      maxTps: max,
      avgTps: avg,
      costPerHour: cfg.costPerHour,
      dollarsPerMillionTokens: dpm,
    });
  }
  entries.sort((a, b) => b.maxTps - a.maxTps);
  return entries;
}

export async function loadShareData(runId: string): Promise<ShareData | null> {
  let dbRun;
  try {
    dbRun = getRun(runId);
  } catch {
    return null;
  }
  if (!dbRun) return null;

  // Map db.Run -> types.Run (the shape buildPodium + downstream expect)
  const run: Run = {
    id: dbRun.id,
    startedAt: dbRun.startedAt,
    endedAt: dbRun.endedAt,
    gpus: dbRun.gpus.map((g) => ({
      name: g.name,
      type: (g.type as string | undefined) ?? "",
      vramGB: (g.vramGB as number | undefined) ?? 0,
      costPerHour: (g.costPerHour as number | undefined) ?? 0,
    })),
    models: dbRun.models,
    label: dbRun.promptLabel ?? undefined,
  };

  let dbProgress: ReturnType<typeof listProgressForRun> = [];
  let dbScores: ReturnType<typeof listScoresForRun> = [];
  try {
    dbProgress = listProgressForRun(runId);
    dbScores = listScoresForRun(runId);
  } catch {
    /* keep empty */
  }

  const events: ProgressEvent[] = dbProgress.map((p) => ({
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
  }));
  const scores: EvalScore[] = dbScores.map((s) => {
    const dims = (s.dimensions as Record<string, number> | null) ?? {};
    return {
      runId: s.runId,
      model: s.model,
      useCase: s.useCase,
      testCaseId: s.testCaseId ?? "",
      composite: s.composite ?? 0,
      dimensions: {
        correctness: Number(dims.correctness ?? 0),
        completeness: Number(dims.completeness ?? 0),
        formatQuality: Number(
          dims.formatQuality ?? dims.format_quality ?? 0,
        ),
        conciseness: Number(dims.conciseness ?? 0),
      },
      tokPerSec: s.tokPerSec ?? 0,
    };
  });

  const podium = buildPodium(run, events);
  const headline = podium[0];
  return {
    run,
    events,
    scores,
    podium,
    headlineTps: headline?.maxTps ?? null,
    headlineGpu: headline?.type ?? null,
    model: deriveModel(run, events),
  };
}
