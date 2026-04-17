// Shared TypeScript types for the live GPU benchmark dashboard.
// Keep in lockstep with /schemas/*.json.

export interface GpuConfig {
  /** Stable id for this lane (e.g. "gpu-a6000"). */
  name: string;
  /** Hardware SKU, e.g. "A6000" | "A100" | "H100". */
  type: string;
  vramGB: number;
  costPerHour: number;
}

export interface Run {
  id: string;
  startedAt: string; // ISO
  endedAt: string | null; // ISO or null while running
  gpus: GpuConfig[];
  models: string[];
  /** Optional human label, e.g. "Nightly Smoke, 2026-04-17". */
  label?: string;
}

export interface ProgressEvent {
  runId: string;
  /** ISO timestamp of the event. */
  ts: string;
  gpuId: string;
  model: string;
  useCase: string;
  tokenPerSec: number;
  latencyMs: number;
  vramUsedMB: number;
  evalProgressIdx: number;
  evalTotal: number;
}

export interface EvalScore {
  runId: string;
  model: string;
  useCase: string;
  testCaseId: string;
  composite: number;
  dimensions: {
    correctness: number;
    completeness: number;
    formatQuality: number;
    conciseness: number;
  };
  tokPerSec: number;
}

/** Discriminator used by /api/ingest to route writes. */
export type IngestPayload =
  | ({ kind: "progress" } & ProgressEvent)
  | ({ kind: "score" } & EvalScore);
