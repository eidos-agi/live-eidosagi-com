"use client";

import type { GpuConfig, ProgressEvent } from "@/lib/types";
import Gauge from "./Gauge";
import Sparkline from "./Sparkline";
import { useRunStream } from "./useRunStream";

interface Props {
  runId: string | null;
  lanes: readonly GpuConfig[];
}

// Map GPU type to a Tailwind text color + hex accent for the lane.
const LANE_THEME: Record<string, { bar: string; text: string }> = {
  A6000: { bar: "#4ade80", text: "text-lane-a6000" },
  A100: { bar: "#60a5fa", text: "text-lane-a100" },
  H100: { bar: "#f472b6", text: "text-lane-h100" },
};

function themeFor(type: string) {
  return LANE_THEME[type] ?? { bar: "#94a3b8", text: "text-gray-300" };
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            connected ? "bg-green-400" : "bg-gray-600"
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
          return (
            <div
              key={gpu.name}
              className="rounded-lg border border-bg-border bg-bg-card p-5 shadow-lg shadow-black/40"
            >
              <header className="flex items-baseline justify-between">
                <h2 className={`text-xl font-bold ${theme.text}`}>
                  {gpu.type}
                </h2>
                <span className="text-xs text-gray-500">
                  ${gpu.costPerHour.toFixed(2)}/hr · {gpu.vramGB}GB
                </span>
              </header>
              <div className="mt-1 text-xs text-gray-500">{gpu.name}</div>

              <div className="mt-5 space-y-3">
                <div>
                  <div className="text-xs uppercase tracking-wider text-gray-500">
                    model
                  </div>
                  <div className="mt-0.5 text-sm text-gray-200">
                    {last?.model ?? "—"}
                  </div>
                </div>

                <Gauge value={last?.tokenPerSec ?? null} accent={theme.bar} />

                <div>
                  <div className="text-xs uppercase tracking-wider text-gray-500">
                    last 60s
                  </div>
                  <Sparkline values={view.spark} stroke={theme.bar} />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="uppercase tracking-wider text-gray-500">
                      use case
                    </div>
                    <div className="text-gray-200">
                      {last?.useCase ?? "—"}
                    </div>
                  </div>
                  <div>
                    <div className="uppercase tracking-wider text-gray-500">
                      eval progress
                    </div>
                    <div className="text-gray-200">
                      {last
                        ? `${last.evalProgressIdx} / ${last.evalTotal}`
                        : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="uppercase tracking-wider text-gray-500">
                      latency
                    </div>
                    <div className="text-gray-200 tabular-nums">
                      {last ? `${last.latencyMs.toFixed(0)} ms` : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="uppercase tracking-wider text-gray-500">
                      vram
                    </div>
                    <div className="text-gray-200 tabular-nums">
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
        <div className="rounded-lg border border-dashed border-bg-border bg-bg-raised p-8 text-center text-sm text-gray-400">
          Waiting for data. POST progress events to{" "}
          <code className="rounded bg-bg-card px-1.5 py-0.5 text-xs text-gray-200">
            /api/ingest
          </code>{" "}
          with header{" "}
          <code className="rounded bg-bg-card px-1.5 py-0.5 text-xs text-gray-200">
            X-Ingest-Token
          </code>
          .
        </div>
      )}
    </div>
  );
}
