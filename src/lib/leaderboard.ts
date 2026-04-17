// Leaderboard aggregation helpers.
//
// Reads runs + progress + scores from the SQLite store (the canonical
// data layer since PR #2). Keep read-only.

import {
  getDb,
  listRuns,
  listProgressForRun,
  listScoresForRun,
  type GpuConfig as DbGpuConfig,
} from "./db";
import type { EvalScore, ProgressEvent, GpuConfig, Run } from "./types";

export interface RawData {
  runs: Run[];
  progress: ProgressEvent[];
  scores: EvalScore[];
}

function dbGpuToTypes(g: DbGpuConfig): GpuConfig {
  return {
    name: g.name,
    type: (g.type ?? "") as string,
    vramGB: (g.vramGB ?? 0) as number,
    costPerHour: (g.costPerHour ?? 0) as number,
  };
}

/**
 * Load every run, progress event, and eval score from SQLite. Returns
 * empty arrays on DB failure (fresh deploy, no volume mounted).
 * Never throws.
 */
export async function loadAllRawData(): Promise<RawData> {
  const out: RawData = { runs: [], progress: [], scores: [] };

  let dbRuns;
  try {
    getDb();
    dbRuns = listRuns(500);
  } catch {
    return out;
  }

  out.runs = dbRuns.map((r) => ({
    id: r.id,
    startedAt: r.startedAt,
    endedAt: r.endedAt,
    gpus: (r.gpus ?? []).map(dbGpuToTypes),
    models: r.models ?? [],
    label: r.promptLabel ?? undefined,
  }));

  for (const r of dbRuns) {
    // progress
    try {
      const prog = listProgressForRun(r.id);
      for (const p of prog) {
        out.progress.push({
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
        });
      }
    } catch {
      // skip this run's progress
    }

    // scores
    try {
      const scores = listScoresForRun(r.id);
      for (const s of scores) {
        const dims =
          (s.dimensions as Record<string, number> | null) ?? {};
        out.scores.push({
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
        });
      }
    } catch {
      // skip this run's scores
    }
  }

  return out;
}

export interface LeaderboardRow {
  model: string;
  gpuId: string;
  gpuType: string | null;
  /** Mean tokens/sec across every progress event we've seen. */
  tokenPerSec: number;
  /** Mean composite score across every eval row for this (model, gpu). */
  compositeScore: number;
  /**
   * Dollars per million tokens, assuming the model sustains `tokenPerSec`
   * on a GPU with `costPerHour`. USD. Null if we can't compute (missing cost
   * or zero throughput).
   */
  costPerMillionTokensUsd: number | null;
  /** How many progress events contributed to tok/s. */
  progressSamples: number;
  /** How many score rows contributed to composite. */
  scoreSamples: number;
}

interface GpuSnapshot {
  gpuType: string | null;
  costPerHour: number | null;
}

function snapshotGpus(runs: Run[]): Map<string, GpuSnapshot> {
  // Use the most recently started run's view of each gpu id.
  const sorted = [...runs].sort((a, b) =>
    a.startedAt < b.startedAt ? 1 : -1,
  );
  const snap = new Map<string, GpuSnapshot>();
  for (const run of sorted) {
    for (const gpu of run.gpus) {
      if (!snap.has(gpu.name)) {
        snap.set(gpu.name, {
          gpuType: gpu.type,
          costPerHour: gpu.costPerHour,
        });
      }
    }
  }
  return snap;
}

function buildKey(model: string, gpuId: string): string {
  return `${model}::${gpuId}`;
}

export async function buildLeaderboard(): Promise<LeaderboardRow[]> {
  const { runs, progress, scores } = await loadAllRawData();
  if (progress.length === 0 && scores.length === 0) return [];

  const gpuSnap = snapshotGpus(runs);

  interface Bucket {
    tokSum: number;
    tokN: number;
    compSum: number;
    compN: number;
  }
  const buckets = new Map<string, Bucket>();

  const ensure = (key: string): Bucket => {
    let b = buckets.get(key);
    if (!b) {
      b = { tokSum: 0, tokN: 0, compSum: 0, compN: 0 };
      buckets.set(key, b);
    }
    return b;
  };

  for (const ev of progress) {
    if (!ev.model || !ev.gpuId) continue;
    const b = ensure(buildKey(ev.model, ev.gpuId));
    if (Number.isFinite(ev.tokenPerSec)) {
      b.tokSum += ev.tokenPerSec;
      b.tokN += 1;
    }
  }

  // scores don't carry gpuId directly — attribute a score to every gpu that
  // ran the same (runId, model) in progress. That's the only honest join we
  // have without a richer schema. If a run only has one gpu lane, this is
  // exact; if multiple, the composite score is replicated across lanes.
  const scoreGpusByRunModel = new Map<string, Set<string>>();
  for (const ev of progress) {
    const k = `${ev.runId}::${ev.model}`;
    let s = scoreGpusByRunModel.get(k);
    if (!s) {
      s = new Set<string>();
      scoreGpusByRunModel.set(k, s);
    }
    s.add(ev.gpuId);
  }

  for (const s of scores) {
    const gpuIds = scoreGpusByRunModel.get(`${s.runId}::${s.model}`);
    if (!gpuIds || gpuIds.size === 0) continue;
    if (!Number.isFinite(s.composite)) continue;
    for (const gpuId of gpuIds) {
      const b = ensure(buildKey(s.model, gpuId));
      b.compSum += s.composite;
      b.compN += 1;
    }
  }

  const rows: LeaderboardRow[] = [];
  for (const [key, b] of buckets) {
    const [model, gpuId] = key.split("::");
    const snap: GpuSnapshot = gpuSnap.get(gpuId) ?? {
      gpuType: null,
      costPerHour: null,
    };
    const meanTokRaw = b.tokN > 0 ? b.tokSum / b.tokN : 0;
    const meanCompRaw = b.compN > 0 ? b.compSum / b.compN : 0;
    const meanTok = Math.round(meanTokRaw * 10) / 10;         // 1 decimal
    const meanComp = Math.round(meanCompRaw * 10) / 10;        // 1 decimal
    let costPerMillion: number | null = null;
    if (snap.costPerHour != null && meanTokRaw > 0) {
      const tokensPerHour = meanTokRaw * 3600;
      const raw = (snap.costPerHour / tokensPerHour) * 1_000_000;
      // 2-decimal $/M tokens is plenty of precision for a leaderboard.
      costPerMillion = Math.round(raw * 100) / 100;
    }
    rows.push({
      model,
      gpuId,
      gpuType: snap.gpuType,
      tokenPerSec: meanTok,
      compositeScore: meanComp,
      costPerMillionTokensUsd: costPerMillion,
      progressSamples: b.tokN,
      scoreSamples: b.compN,
    });
  }

  // Default sort: composite desc, then tok/s desc.
  rows.sort((a, b) => {
    if (b.compositeScore !== a.compositeScore)
      return b.compositeScore - a.compositeScore;
    return b.tokenPerSec - a.tokenPerSec;
  });
  return rows;
}
