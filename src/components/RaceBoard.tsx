"use client";

import type { GpuConfig, ProgressEvent } from "@/lib/types";
import Gauge from "./Gauge";
import Sparkline from "./Sparkline";
import { useRunStream } from "./useRunStream";

interface Props {
  runId: string | null;
  lanes: readonly GpuConfig[];
}

// Workshop palette lane colors — amber brass is THE accent.
// A100 wears it as the leader; others get command/sage.
const LANE_THEME: Record<string, { bar: string; text: string }> = {
  A6000: { bar: "#b8c4a0", text: "text-lane-a6000" },
  A100: { bar: "#c4935a", text: "text-lane-a100" },
  H100: { bar: "#7a8c72", text: "text-lane-h100" },
};

function themeFor(type: string) {
  return LANE_THEME[type] ?? { bar: "#8b8179", text: "text-workshop-muted" };
}

// VRAM "hot" threshold — >85% of advertised capacity glows terracotta.
function isVramHot(usedMB: number, capacityGB: number): boolean {
  if (!capacityGB) return false;
  return usedMB / 1024 / capacityGB >= 0.85;
}

/** Return the last event for a GPU lane, plus the last 60s sparkline values. */
function laneView(
  events: ProgressEvent[],
  gpuId: string,
): { last: ProgressEvent | null; spark: number[] } {
  const forLane = events.filter((e) => e.gpuId === gpuId);
  if (forLane.length === 0) return { last: null, spark: [] };
  const last = forLane[forLane.length - 1];
  const cutoff = Date.parse(last.ts) - 60_000;
  const spark = forLane
    .filter((e) => Date.parse(e.ts) >= cutoff)
    .map((e) => e.tokenPerSec);
  return { last, spark };
}

export default function RaceBoard({ runId, lanes }: Props) {
  const { events, connected } = useRunStream(runId);

  // Find the leader lane — highest current tok/s among lanes with events.
  let leaderLane: string | null = null;
  let leaderTps = -Infinity;
  for (const gpu of lanes) {
    const { last } = laneView(events, gpu.name);
    if (last && last.tokenPerSec > leaderTps) {
      leaderTps = last.tokenPerSec;
      leaderLane = gpu.name;
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 font-mono text-xs text-workshop-muted">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            connected ? "bg-workshop-command" : "bg-workshop-muted/40"
          }`}
        />
        {runId
          ? connected
            ? `streaming · run ${runId}`
            : "connecting..."
          : "no active run"}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {lanes.map((gpu) => {
          const theme = themeFor(gpu.type);
          const view = laneView(events, gpu.name);
          const last = view.last;
          const isLeader = leaderLane === gpu.name;
          const vramHot = last ? isVramHot(last.vramUsedMB, gpu.vramGB) : false;
          return (
            <div
              key={gpu.name}
              className={`rounded border border-workshop-muted/20 bg-workshop-surface p-5 transition-shadow ${
                isLeader ? "lane-leader" : ""
              }`}
            >
              <header className="flex items-baseline justify-between">
                <h2
                  className="font-heading text-xl font-bold"
                  style={{ color: theme.bar }}
                >
                  {gpu.type}
                  {isLeader && (
                    <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-workshop-primary">
                      leader
                    </span>
                  )}
                </h2>
                <span className="font-mono text-xs text-workshop-muted tnum">
                  ${gpu.costPerHour.toFixed(2)}/hr · {gpu.vramGB}GB
                </span>
              </header>
              <div className="mt-1 font-mono text-xs text-workshop-muted">
                {gpu.name}
              </div>

              <div className="mt-5 space-y-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
                    model
                  </div>
                  <div className="mt-0.5 text-sm text-workshop-text">
                    {last?.model ?? "—"}
                  </div>
                </div>

                <Gauge value={last?.tokenPerSec ?? null} accent={theme.bar} />

                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
                    last 60s
                  </div>
                  <Sparkline values={view.spark} stroke={theme.bar} />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
                      use case
                    </div>
                    <div className="text-workshop-text">
                      {last?.useCase ?? "—"}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
                      eval progress
                    </div>
                    <div className="text-workshop-text tnum">
                      {last
                        ? `${last.evalProgressIdx} / ${last.evalTotal}`
                        : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
                      latency
                    </div>
                    <div className="text-workshop-text tnum">
                      {last ? `${last.latencyMs.toFixed(0)} ms` : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
                      vram
                    </div>
                    <div
                      className={`tnum ${
                        vramHot ? "vram-hot" : "text-workshop-text"
                      }`}
                    >
                      {last
                        ? `${(last.vramUsedMB / 1024).toFixed(1)} GB`
                        : "—"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {events.length === 0 && (
        <div className="rounded border border-dashed border-workshop-muted/25 bg-workshop-surface/50 p-8 text-center text-sm text-workshop-muted">
          Waiting for data. POST progress events to{" "}
          <code className="rounded bg-workshop-bg px-1.5 py-0.5 font-mono text-xs text-workshop-command">
            /api/ingest
          </code>{" "}
          with header{" "}
          <code className="rounded bg-workshop-bg px-1.5 py-0.5 font-mono text-xs text-workshop-command">
            X-Ingest-Token
          </code>
          .
        </div>
      )}
    </div>
  );
}
