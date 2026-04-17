"use client";

import { useMemo } from "react";
import type { EvalScore, ProgressEvent, Run } from "@/lib/types";
import TimeSeriesChart from "./TimeSeriesChart";
import { useRunStream } from "./useRunStream";

interface Props {
  run: Run;
  initialScores: EvalScore[];
}

// Stable color palette per GPU lane type.
const LANE_COLOR: Record<string, string> = {
  A6000: "#b8c4a0",  // command green
  A100: "#c4935a",   // amber brass (leader accent)
  H100: "#7a8c72",   // sage
};

function colorFor(gpuId: string, lanes: Run["gpus"]): string {
  const gpu = lanes.find((g) => g.name === gpuId);
  return (gpu && LANE_COLOR[gpu.type]) ?? "#8b8179";
}

/**
 * Pivot events by gpuId and align to a shared x-axis (unix seconds).
 * Missing samples become null so uPlot shows gaps, not interpolated lies.
 */
function buildSeries(
  events: ProgressEvent[],
  gpuIds: string[],
  field: keyof Pick<ProgressEvent, "tokenPerSec" | "latencyMs" | "vramUsedMB">,
) {
  const xs: number[] = [];
  const buckets = new Map<number, Map<string, number>>();
  for (const e of events) {
    const sec = Math.floor(Date.parse(e.ts) / 1000);
    if (!buckets.has(sec)) buckets.set(sec, new Map());
    buckets.get(sec)!.set(e.gpuId, e[field] as number);
  }
  const sorted = Array.from(buckets.keys()).sort((a, b) => a - b);
  const perGpu: Record<string, Array<number | null>> = {};
  for (const id of gpuIds) perGpu[id] = [];
  for (const sec of sorted) {
    xs.push(sec);
    const m = buckets.get(sec)!;
    for (const id of gpuIds) {
      perGpu[id].push(m.get(id) ?? null);
    }
  }
  return { xs, perGpu };
}

export default function RunDetail({ run, initialScores }: Props) {
  const { events, connected } = useRunStream(run.endedAt == null ? run.id : null);
  // If run is live, prefer streamed events. Otherwise fetch-once via the
  // snapshot endpoint inside useRunStream seed — but if endedAt is set we
  // still want to show history; fetch on mount.
  const allEvents = events;

  const gpuIds = useMemo(() => {
    const set = new Set<string>();
    for (const e of allEvents) set.add(e.gpuId);
    // Fall back to configured lanes if no events yet.
    if (set.size === 0) return run.gpus.map((g) => g.name);
    return Array.from(set);
  }, [allEvents, run.gpus]);

  const tokSeries = useMemo(() => {
    const { xs, perGpu } = buildSeries(allEvents, gpuIds, "tokenPerSec");
    return {
      xs,
      series: gpuIds.map((id) => ({
        label: id,
        color: colorFor(id, run.gpus),
        values: perGpu[id],
      })),
    };
  }, [allEvents, gpuIds, run.gpus]);

  const latencySeries = useMemo(() => {
    const { xs, perGpu } = buildSeries(allEvents, gpuIds, "latencyMs");
    return {
      xs,
      series: gpuIds.map((id) => ({
        label: id,
        color: colorFor(id, run.gpus),
        values: perGpu[id],
      })),
    };
  }, [allEvents, gpuIds, run.gpus]);

  const vramSeries = useMemo(() => {
    const { xs, perGpu } = buildSeries(allEvents, gpuIds, "vramUsedMB");
    return {
      xs,
      series: gpuIds.map((id) => ({
        label: id,
        color: colorFor(id, run.gpus),
        values: perGpu[id],
      })),
    };
  }, [allEvents, gpuIds, run.gpus]);

  // Score matrix: model x useCase -> composite (averaged across test cases).
  const matrix = useMemo(() => {
    const byModel = new Map<string, Map<string, { sum: number; n: number }>>();
    const useCases = new Set<string>();
    for (const s of initialScores) {
      useCases.add(s.useCase);
      if (!byModel.has(s.model)) byModel.set(s.model, new Map());
      const row = byModel.get(s.model)!;
      const cell = row.get(s.useCase) ?? { sum: 0, n: 0 };
      cell.sum += s.composite;
      cell.n += 1;
      row.set(s.useCase, cell);
    }
    return {
      useCases: Array.from(useCases).sort(),
      models: Array.from(byModel.keys()).sort(),
      byModel,
    };
  }, [initialScores]);

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              connected ? "bg-green-400" : "bg-gray-600"
            }`}
          />
          {run.endedAt ? "archived" : connected ? "streaming" : "idle"}
        </div>
        <h1 className="mt-1 font-mono text-2xl font-bold text-white">
          {run.id}
        </h1>
        <p className="text-sm text-gray-400">
          {new Date(run.startedAt).toISOString()} →{" "}
          {run.endedAt ? new Date(run.endedAt).toISOString() : "live"}
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-sm uppercase tracking-wider text-gray-500">
          Tokens / second
        </h2>
        <div className="rounded-lg border border-bg-border bg-bg-card p-4">
          {allEvents.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              Waiting for data.
            </div>
          ) : (
            <TimeSeriesChart
              xs={tokSeries.xs}
              series={tokSeries.series}
              yLabel="tok/s"
            />
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm uppercase tracking-wider text-gray-500">
          Latency (ms)
        </h2>
        <div className="rounded-lg border border-bg-border bg-bg-card p-4">
          {allEvents.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              Waiting for data.
            </div>
          ) : (
            <TimeSeriesChart
              xs={latencySeries.xs}
              series={latencySeries.series}
              yLabel="ms"
            />
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm uppercase tracking-wider text-gray-500">
          VRAM (MB)
        </h2>
        <div className="rounded-lg border border-bg-border bg-bg-card p-4">
          {allEvents.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              Waiting for data.
            </div>
          ) : (
            <TimeSeriesChart
              xs={vramSeries.xs}
              series={vramSeries.series}
              yLabel="MB"
            />
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm uppercase tracking-wider text-gray-500">
          Model × Use-Case Composite
        </h2>
        {matrix.models.length === 0 ? (
          <div className="rounded-lg border border-dashed border-bg-border bg-bg-raised p-8 text-center text-sm text-gray-400">
            No scored test cases yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-bg-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg-raised text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-2">Model</th>
                  {matrix.useCases.map((uc) => (
                    <th key={uc} className="px-4 py-2">
                      {uc}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-bg-border">
                {matrix.models.map((model) => (
                  <tr key={model}>
                    <td className="px-4 py-2 font-mono text-gray-200">
                      {model}
                    </td>
                    {matrix.useCases.map((uc) => {
                      const cell = matrix.byModel.get(model)?.get(uc);
                      const avg = cell ? cell.sum / cell.n : null;
                      return (
                        <td
                          key={uc}
                          className="px-4 py-2 tabular-nums text-gray-100"
                        >
                          {avg == null ? "—" : avg.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
