// Rule-based commentary helper.
//
// Analyzes the last minute of progress events for a run and produces a
// one-line English narration. Pure logic — no I/O. Caller is responsible
// for fetching events via readEvents() from store.ts.
//
// TODO: later hook to an on-GPU LLM summarizer for richer narration.

import type { ProgressEvent, Run } from "./types";

const EMPTY_STATE = "Silicon cooling. Next ignition soon.";

interface LaneSnapshot {
  gpuId: string;
  type: string; // A6000 / A100 / H100 — resolved from the Run config
  lastTps: number;
  lastTs: number;
  model: string;
  sampleCount: number;
  vramPct: number;
}

/**
 * Produce a one-line commentary string from the last-minute of events.
 * Returns a friendly empty-state message if the window is empty.
 */
export function narrate(
  run: Run | null,
  events: ProgressEvent[],
): string {
  if (!run || events.length === 0) return EMPTY_STATE;

  const cutoff = Date.now() - 60_000;
  const window = events.filter((e) => Date.parse(e.ts) >= cutoff);
  if (window.length === 0) return EMPTY_STATE;

  // Group by gpuId, take the latest sample per lane.
  const byLane = new Map<string, LaneSnapshot>();
  for (const ev of window) {
    const gpu = run.gpus.find((g) => g.name === ev.gpuId);
    const vramCap = gpu ? gpu.vramGB * 1024 : 0;
    const ts = Date.parse(ev.ts);
    const existing = byLane.get(ev.gpuId);
    if (!existing) {
      byLane.set(ev.gpuId, {
        gpuId: ev.gpuId,
        type: gpu?.type ?? ev.gpuId,
        lastTps: ev.tokenPerSec,
        lastTs: ts,
        model: ev.model,
        sampleCount: 1,
        vramPct: vramCap ? ev.vramUsedMB / vramCap : 0,
      });
    } else {
      existing.sampleCount += 1;
      if (ts >= existing.lastTs) {
        existing.lastTps = ev.tokenPerSec;
        existing.lastTs = ts;
        existing.model = ev.model;
        if (vramCap) existing.vramPct = ev.vramUsedMB / vramCap;
      }
    }
  }

  const lanes = Array.from(byLane.values()).sort(
    (a, b) => b.lastTps - a.lastTps,
  );
  if (lanes.length === 0) return EMPTY_STATE;

  const leader = lanes[0];
  const pieces: string[] = [];

  if (lanes.length >= 2) {
    const trailer = lanes[lanes.length - 1];
    const gap = leader.lastTps - trailer.lastTps;
    const model = leader.model || "the model";
    pieces.push(
      `${leader.type} leads ${model} by ${gap.toFixed(0)} tok/s over ${trailer.type}.`,
    );
  } else {
    pieces.push(
      `${leader.type} running ${leader.model || "model"} at ${leader.lastTps.toFixed(0)} tok/s.`,
    );
  }

  // Secondary clause: flag any hot VRAM lane.
  const hot = lanes.find((l) => l.vramPct >= 0.9);
  if (hot && hot.gpuId !== leader.gpuId) {
    pieces.push(`${hot.type} near VRAM cap at ${(hot.vramPct * 100).toFixed(0)}%.`);
  }

  // Sample density hint.
  const thin = lanes.find((l) => l.sampleCount <= 1);
  if (thin && !hot) {
    pieces.push(`${thin.type} sampling thin — just warming up.`);
  }

  return pieces.join(" ");
}

export { EMPTY_STATE };
