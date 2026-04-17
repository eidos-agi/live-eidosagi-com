// HeadlineCard — hero number card above the RaceBoard.
//
// Pulls live data from the SQLite leaderboard aggregation and picks the model
// with the biggest $/1M-tokens spread across GPUs. That comparison IS the
// pitch: "the expensive GPU is the cheap GPU per token."
//
// Server component (no client polling). Re-renders on layout.AutoRefresh tick.

import Link from "next/link";
import { buildLeaderboard } from "@/lib/leaderboard";

function fmtUsd(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "$0.00";
  if (n >= 100) return `$${n.toFixed(0)}`;
  if (n >= 10) return `$${n.toFixed(1)}`;
  return `$${n.toFixed(2)}`;
}

function fmtTokS(n: number): string {
  if (n >= 100) return n.toFixed(0);
  return n.toFixed(1);
}

interface Row {
  model: string;
  gpuId: string;
  gpuType: string | null;
  tokenPerSec: number;
  compositeScore: number;
  costPerMillionTokensUsd: number | null;
}

interface Best {
  model: string;
  cheapest: Row;
  expensive: Row;
  ratio: number;
}

async function pickHeadline(): Promise<Best | null> {
  let rows: Row[];
  try {
    rows = (await buildLeaderboard()) as Row[];
  } catch {
    return null;
  }
  const byModel = new Map<string, Row[]>();
  for (const r of rows) {
    if (r.costPerMillionTokensUsd == null || r.costPerMillionTokensUsd <= 0) continue;
    if (!byModel.has(r.model)) byModel.set(r.model, []);
    byModel.get(r.model)!.push(r);
  }
  let best: Best | null = null;
  for (const [model, arr] of byModel) {
    if (arr.length < 2) continue;
    const sorted = [...arr].sort(
      (a, b) =>
        (a.costPerMillionTokensUsd ?? 0) - (b.costPerMillionTokensUsd ?? 0),
    );
    const cheapest = sorted[0];
    const expensive = sorted[sorted.length - 1];
    const ratio =
      (expensive.costPerMillionTokensUsd ?? 0) /
      (cheapest.costPerMillionTokensUsd ?? 1);
    if (!best || ratio > best.ratio) {
      best = { model, cheapest, expensive, ratio };
    }
  }
  return best;
}

export default async function HeadlineCard() {
  const best = await pickHeadline();

  if (!best) {
    return null; // nothing to show until runs land
  }

  const { model, cheapest, expensive, ratio } = best;

  return (
    <div className="relative overflow-hidden rounded border border-workshop-primary/25 bg-gradient-to-br from-[var(--color-surface)] via-[var(--color-surface)]/90 to-[var(--color-bg)]/80">
      <div className="grid gap-6 p-6 md:grid-cols-[auto_1fr_auto] md:items-center">
        {/* Left — the hook */}
        <div className="space-y-1">
          <div className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
            today&apos;s punchline
          </div>
          <div className="font-heading text-xl font-bold leading-tight text-workshop-text">
            The expensive GPU
            <br />
            is the cheap one.
          </div>
          <div className="text-[11px] text-workshop-muted">
            same model · measured live
          </div>
        </div>

        {/* Middle — the two numbers */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded border border-workshop-command/30 bg-workshop-bg/40 p-4">
            <div className="font-mono text-[10px] uppercase tracking-wider text-workshop-command">
              cheapest per token · winner
            </div>
            <div className="mt-1 font-heading text-3xl font-bold leading-none text-workshop-command tnum">
              {fmtUsd(cheapest.costPerMillionTokensUsd ?? 0)}
            </div>
            <div className="mt-1 font-mono text-[11px] text-workshop-text">
              <span className="tnum">{fmtTokS(cheapest.tokenPerSec)} tok/s</span>
              {" · "}
              <span className="text-workshop-primary">
                {cheapest.gpuType ?? cheapest.gpuId}
              </span>
            </div>
            <div className="mt-0.5 font-mono text-[10px] text-workshop-muted">
              per 1M tokens
            </div>
          </div>

          <div className="rounded border border-workshop-muted/25 bg-workshop-bg/40 p-4">
            <div className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
              most expensive per token
            </div>
            <div className="mt-1 font-heading text-3xl font-bold leading-none text-workshop-text tnum">
              {fmtUsd(expensive.costPerMillionTokensUsd ?? 0)}
            </div>
            <div className="mt-1 font-mono text-[11px] text-workshop-text">
              <span className="tnum">{fmtTokS(expensive.tokenPerSec)} tok/s</span>
              {" · "}
              <span className="text-workshop-muted">
                {expensive.gpuType ?? expensive.gpuId}
              </span>
            </div>
            <div className="mt-0.5 font-mono text-[10px] text-workshop-muted">
              per 1M tokens
            </div>
          </div>
        </div>

        {/* Right — the spread */}
        <div className="flex flex-col items-end gap-1 text-right">
          <div className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
            {model}
          </div>
          <div className="font-heading text-4xl font-bold leading-none text-workshop-primary tnum">
            {ratio.toFixed(1)}×
          </div>
          <div className="font-mono text-[11px] text-workshop-muted">
            cheaper per token
          </div>
          <Link
            href="/research/why-local-matters"
            className="mt-2 font-mono text-[10px] uppercase tracking-wider text-workshop-muted transition hover:text-workshop-primary"
          >
            why →
          </Link>
        </div>
      </div>
    </div>
  );
}
