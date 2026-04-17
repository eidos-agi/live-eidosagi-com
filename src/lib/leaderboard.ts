// Leaderboard aggregation helpers.
//
// Intentionally separate from src/lib/events.ts (which talks to the Activity
// Stream's Postgres) and src/lib/store.ts (which the SQLite-refactor subagent
// will soon replace). This module reads the run/progress/score JSONL files
// directly and aggregates by (model, gpu). Keep it read-only.
//
// If the on-disk layout migrates to SQLite, swap the internals of
// `loadAllRawData()` and the rest of the file stays put.

import { promises as fs } from "node:fs";
import path from "node:path";
import type { EvalScore, ProgressEvent, Run } from "./types";

const DATA_ROOT = path.join(process.cwd(), "data", "runs");

export interface RawData {
  runs: Run[];
  progress: ProgressEvent[];
  scores: EvalScore[];
}

/**
 * Load every run, progress event, and eval score from the JSONL store.
 * Returns empty arrays if the data directory does not exist yet (fresh deploy,
 * no volume mounted, etc). Never throws.
 */
export async function loadAllRawData(): Promise<RawData> {
  const out: RawData = { runs: [], progress: [], scores: [] };
  let entries;
  try {
    entries = await fs.readdir(DATA_ROOT, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const runId = entry.name;
    const runDir = path.join(DATA_ROOT, runId);

    // run.json
    try {
      const raw = await fs.readFile(path.join(runDir, "run.json"), "utf8");
      out.runs.push(JSON.parse(raw) as Run);
    } catch {
      // skip runs without run.json — they may be mid-write
      continue;
    }

    // events.jsonl (progress)
    try {
      const raw = await fs.readFile(
        path.join(runDir, "events.jsonl"),
        "utf8",
      );
      for (const line of raw.split("\n")) {
        if (!line.trim()) continue;
        try {
          out.progress.push(JSON.parse(line) as ProgressEvent);
        } catch {
          // ignore malformed line
        }
      }
    } catch {
      // no events yet — fine
    }

    // scores.jsonl
    try {
      const raw = await fs.readFile(
        path.join(runDir, "scores.jsonl"),
        "utf8",
      );
      for (const line of raw.split("\n")) {
        if (!line.trim()) continue;
        try {
          out.scores.push(JSON.parse(line) as EvalScore);
        } catch {
          // ignore malformed line
        }
      }
    } catch {
      // no scores yet — fine
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
    const meanTok = b.tokN > 0 ? b.tokSum / b.tokN : 0;
    const meanComp = b.compN > 0 ? b.compSum / b.compN : 0;
    let costPerMillion: number | null = null;
    if (snap.costPerHour != null && meanTok > 0) {
      const tokensPerHour = meanTok * 3600;
      costPerMillion = (snap.costPerHour / tokensPerHour) * 1_000_000;
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
