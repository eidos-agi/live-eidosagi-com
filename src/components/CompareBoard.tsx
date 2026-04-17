"use client";

import { useMemo, useState } from "react";
import type { EvalScore, ProgressEvent } from "@/lib/types";

interface Props {
  events: Array<ProgressEvent & { gpuType: string }>;
  scores: EvalScore[];
}

/** Mean of a non-empty number list. */
function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export default function CompareBoard({ events, scores }: Props) {
  const models = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) set.add(e.model);
    for (const s of scores) set.add(s.model);
    return Array.from(set).sort();
  }, [events, scores]);

  const gpuTypes = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) set.add(e.gpuType);
    return Array.from(set).sort();
  }, [events]);

  const [picked, setPicked] = useState<Set<string>>(new Set());

  const toggle = (m: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  };

  // Aggregate per (model, gpuType) and per model for composite.
  const tokTable = useMemo(() => {
    const bucket = new Map<string, Map<string, number[]>>();
    for (const e of events) {
      if (!bucket.has(e.model)) bucket.set(e.model, new Map());
      const row = bucket.get(e.model)!;
      const list = row.get(e.gpuType) ?? [];
      list.push(e.tokenPerSec);
      row.set(e.gpuType, list);
    }
    return bucket;
  }, [events]);

  const compositeByModel = useMemo(() => {
    const bucket = new Map<string, number[]>();
    for (const s of scores) {
      const list = bucket.get(s.model) ?? [];
      list.push(s.composite);
      bucket.set(s.model, list);
    }
    return bucket;
  }, [scores]);

  const rows = picked.size === 0 ? models : models.filter((m) => picked.has(m));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Compare</h1>
        <p className="mt-1 text-sm text-gray-400">
          Pick two or more models to compare tok/s across GPUs and overall
          composite scores. With no picks, shows every model seen.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {models.length === 0 ? (
          <div className="text-sm text-gray-500">
            No data yet — ingest a run to populate this page.
          </div>
        ) : (
          models.map((m) => {
            const on = picked.has(m);
            return (
              <button
                key={m}
                onClick={() => toggle(m)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  on
                    ? "border-blue-400 bg-blue-500/20 text-blue-200"
                    : "border-bg-border bg-bg-card text-gray-300 hover:border-gray-500"
                }`}
              >
                {m}
              </button>
            );
          })
        )}
      </div>

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-bg-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg-raised text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-2">Model</th>
                {gpuTypes.map((g) => (
                  <th key={g} className="px-4 py-2">
                    {g} tok/s
                  </th>
                ))}
                <th className="px-4 py-2 text-right">Composite</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bg-border">
              {rows.map((m) => (
                <tr key={m}>
                  <td className="px-4 py-2 font-mono text-gray-200">{m}</td>
                  {gpuTypes.map((g) => {
                    const list = tokTable.get(m)?.get(g) ?? [];
                    return (
                      <td
                        key={g}
                        className="px-4 py-2 tabular-nums text-gray-100"
                      >
                        {list.length === 0 ? "—" : mean(list).toFixed(1)}
                      </td>
                    );
                  })}
                  <td className="px-4 py-2 text-right tabular-nums text-gray-100">
                    {(() => {
                      const list = compositeByModel.get(m) ?? [];
                      return list.length === 0 ? "—" : mean(list).toFixed(2);
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
