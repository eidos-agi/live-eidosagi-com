"use client";

// /models — sortable model × GPU leaderboard.
// Client component: fetches /api/models once, stores rows in state, sorts in
// memory. Empty state when the API returns zero rows.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface LeaderboardRow {
  model: string;
  gpuId: string;
  gpuType: string | null;
  tokenPerSec: number;
  compositeScore: number;
  costPerMillionTokensUsd: number | null;
  progressSamples: number;
  scoreSamples: number;
}

type SortKey =
  | "model"
  | "gpuId"
  | "tokenPerSec"
  | "compositeScore"
  | "costPerMillionTokensUsd";
type SortDir = "asc" | "desc";

function formatNumber(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatUsd(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 10) return `$${n.toFixed(2)}`;
  if (n >= 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(4)}`;
}

export default function ModelsPage() {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("compositeScore");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await fetch("/api/models", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as {
          rows: LeaderboardRow[];
          count: number;
        };
        if (!cancel) setRows(body.rows ?? []);
      } catch (err) {
        if (!cancel)
          setError(err instanceof Error ? err.message : "fetch failed");
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const sorted = useMemo(() => {
    if (!rows) return null;
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      let cmp: number;
      if (va == null && vb == null) cmp = 0;
      else if (va == null) cmp = 1;
      else if (vb == null) cmp = -1;
      else if (typeof va === "number" && typeof vb === "number")
        cmp = va - vb;
      else cmp = String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  function onSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      // numeric columns default to descending, string columns to ascending
      setSortDir(
        key === "model" || key === "gpuId" ? "asc" : "desc",
      );
    }
  }

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  return (
    <div className="space-y-6 py-6">
      <header className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-workshop-primary">
          Leaderboard
        </p>
        <h1 className="font-heading text-4xl font-bold text-workshop-text">
          Models
        </h1>
        <p className="max-w-3xl text-workshop-muted">
          Every model, on every GPU, with tokens per second, the composite
          score across all eight use cases, and the resulting dollars per
          million tokens. Click a column to sort.{" "}
          <Link
            href="/methodology"
            className="text-workshop-primary underline-offset-4 hover:underline"
          >
            How we measure →
          </Link>
        </p>
      </header>

      {error && (
        <div className="rounded border border-workshop-danger/40 bg-workshop-surface/40 p-3 font-mono text-sm text-workshop-danger">
          Error: {error}
        </div>
      )}

      {sorted && sorted.length === 0 && !error && (
        <div className="rounded border border-workshop-muted/20 bg-workshop-surface/40 p-6 text-center">
          <p className="font-heading text-workshop-text">
            No runs recorded yet — check back soon.
          </p>
          <p className="mt-2 text-sm text-workshop-muted">
            When a run finishes, its progress and scores will land here
            automatically.
          </p>
        </div>
      )}

      {sorted && sorted.length > 0 && (
        <div className="overflow-x-auto rounded border border-workshop-muted/20">
          <table className="w-full text-sm">
            <thead className="bg-workshop-surface/80 text-left">
              <tr>
                <Th
                  label={`Model${arrow("model")}`}
                  onClick={() => onSort("model")}
                />
                <Th
                  label={`GPU${arrow("gpuId")}`}
                  onClick={() => onSort("gpuId")}
                />
                <Th
                  label={`tok/s${arrow("tokenPerSec")}`}
                  onClick={() => onSort("tokenPerSec")}
                  align="right"
                />
                <Th
                  label={`Composite${arrow("compositeScore")}`}
                  onClick={() => onSort("compositeScore")}
                  align="right"
                />
                <Th
                  label={`$/1M tok${arrow("costPerMillionTokensUsd")}`}
                  onClick={() => onSort("costPerMillionTokensUsd")}
                  align="right"
                />
                <Th label="Samples" align="right" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr
                  key={`${r.model}::${r.gpuId}`}
                  className="border-t border-workshop-muted/10"
                >
                  <td className="p-3 font-heading text-workshop-text">
                    {r.model}
                  </td>
                  <td className="p-3 text-workshop-muted">
                    <span className="font-mono text-workshop-command">
                      {r.gpuId}
                    </span>
                    {r.gpuType && (
                      <span className="ml-2 text-xs text-workshop-muted">
                        {r.gpuType}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right font-mono text-workshop-command tnum">
                    {formatNumber(r.tokenPerSec, 1)}
                  </td>
                  <td className="p-3 text-right font-mono text-workshop-primary tnum">
                    {formatNumber(r.compositeScore, 3)}
                  </td>
                  <td className="p-3 text-right font-mono text-workshop-text tnum">
                    {formatUsd(r.costPerMillionTokensUsd)}
                  </td>
                  <td className="p-3 text-right font-mono text-workshop-muted tnum">
                    {r.progressSamples} / {r.scoreSamples}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows === null && !error && (
        <p className="font-mono text-sm text-workshop-muted">Loading…</p>
      )}

      <p className="font-mono text-xs text-workshop-muted">
        Samples column: progress-events / score-rows. All data available as{" "}
        <Link href="/api/models" className="text-workshop-command">
          JSON
        </Link>{" "}
        or via the{" "}
        <Link
          href="/methodology#download"
          className="text-workshop-primary underline-offset-4 hover:underline"
        >
          raw downloads on /methodology
        </Link>
        .
      </p>
    </div>
  );
}

function Th({
  label,
  onClick,
  align = "left",
}: {
  label: string;
  onClick?: () => void;
  align?: "left" | "right";
}) {
  return (
    <th
      onClick={onClick}
      className={`p-3 font-heading text-xs font-bold uppercase tracking-wider text-workshop-text ${
        onClick ? "cursor-pointer select-none hover:text-workshop-primary" : ""
      } ${align === "right" ? "text-right" : "text-left"}`}
    >
      {label}
    </th>
  );
}
