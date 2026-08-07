// /models/[name] — per-model detail page.
// SSR, no client fetch. Pulls registry + leaderboard from SQLite and
// joins in memory. Visitor clicks a card on /models → lands here.

import Link from "next/link";
import { notFound } from "next/navigation";
import { listModels, type ModelRow } from "@/lib/db";
import { buildLeaderboard, type LeaderboardRow } from "@/lib/leaderboard";

export const runtime = "nodejs";
export const revalidate = 60;

interface Props {
  params: Promise<{ name: string }>;
}

// ── formatting ────────────────────────────────────────────────────────

function fmtSize(gb: number | null): string {
  if (gb == null) return "—";
  if (gb < 1) return `${(gb * 1000).toFixed(0)} MB`;
  if (gb < 10) return `${gb.toFixed(1)} GB`;
  return `${gb.toFixed(0)} GB`;
}
function fmtParams(b: number | null): string {
  if (b == null) return "—";
  if (b < 1) return `${(b * 1000).toFixed(0)}M`;
  if (b < 10) return `${b.toFixed(1)}B`;
  return `${b.toFixed(0)}B`;
}
function fmtTokps(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n < 10) return n.toFixed(1);
  return Math.round(n).toString();
}
function fmtUsd(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 10) return `$${n.toFixed(2)}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(3)}`;
}

function familyTone(family: string): { chip: string; accent: string } {
  switch (family) {
    case "qwen":
      return {
        chip: "border-workshop-primary/50 text-workshop-primary bg-workshop-primary/5",
        accent: "text-workshop-primary",
      };
    case "llama":
      return {
        chip: "border-workshop-command/50 text-workshop-command bg-workshop-command/5",
        accent: "text-workshop-command",
      };
    case "gemma":
      return {
        chip: "border-workshop-secondary/50 text-workshop-secondary bg-workshop-secondary/5",
        accent: "text-workshop-secondary",
      };
    case "deepseek":
      return {
        chip: "border-workshop-danger/50 text-workshop-danger bg-workshop-danger/5",
        accent: "text-workshop-danger",
      };
    default:
      return {
        chip: "border-workshop-muted/40 text-workshop-muted bg-workshop-muted/5",
        accent: "text-workshop-text",
      };
  }
}

// ── metadata ──────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props) {
  const { name } = await params;
  const decoded = decodeURIComponent(name);
  return {
    title: `${decoded} · live.eidosagi.com`,
    description: `Registry + live benchmark throughput for ${decoded} on this site's GPUs.`,
  };
}

// ── page ──────────────────────────────────────────────────────────────

function findModel(models: ModelRow[], name: string): ModelRow | null {
  // Exact match first, then try matching on the stripped-alias form
  // (qwen3.6:latest → qwen3.6). Support links that pass either encoding.
  const direct = models.find((m) => m.name === name);
  if (direct) return direct;
  const decoded = decodeURIComponent(name);
  return models.find((m) => m.name === decoded) ?? null;
}

function perfFor(rows: LeaderboardRow[], modelName: string): LeaderboardRow[] {
  return rows
    .filter((r) => r.model === modelName && r.progressSamples > 0)
    .sort((a, b) => b.tokenPerSec - a.tokenPerSec);
}

export default async function ModelDetailPage({ params }: Props) {
  const { name } = await params;
  const [models, leaderboard] = await Promise.all([
    Promise.resolve(listModels()),
    buildLeaderboard(),
  ]);
  const model = findModel(models, name);
  if (!model) notFound();

  const perf = perfFor(leaderboard, model.name);
  const tone = familyTone(model.family);
  const topTps = perf[0]?.tokenPerSec ?? 0;
  const bestTps = Math.max(
    1,
    ...leaderboard.map((r) => (r.progressSamples > 0 ? r.tokenPerSec : 0)),
  );

  const pullCmd = `ollama pull ${model.name}`;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 text-workshop-text">
      <nav className="mb-6 font-mono text-[11px] uppercase tracking-wider text-workshop-muted">
        <Link href="/models" className="hover:text-workshop-primary">
          ← all models
        </Link>
      </nav>

      <header className="mb-8">
        <h1
          className={`font-mono text-3xl font-semibold tracking-tight ${tone.accent}`}
        >
          {model.name}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={`inline-block rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tone.chip}`}
          >
            {model.family}
            {model.generation ? ` ${model.generation}` : ""}
          </span>
          {model.architecture && (
            <span className="inline-block rounded border border-workshop-muted/30 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
              {model.architecture}
            </span>
          )}
          {model.defaultInHarness && (
            <span className="inline-block rounded border border-workshop-command/50 bg-workshop-command/5 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-workshop-command">
              harness default
            </span>
          )}
          {model.inRaceRotation && (
            <span className="inline-block rounded border border-workshop-primary/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-workshop-primary">
              race rotation
            </span>
          )}
          {model.pulledOnH100 && (
            <span className="inline-block rounded border border-workshop-muted/30 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
              on H100
            </span>
          )}
        </div>
      </header>

      {/* Specs grid */}
      <section className="mb-8 grid grid-cols-2 gap-4 rounded border border-workshop-muted/25 bg-workshop-surface/50 p-5 md:grid-cols-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
            params
          </div>
          <div className="mt-1 font-mono tnum text-workshop-text">
            {fmtParams(model.totalParamsB)}
          </div>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
            active per token
          </div>
          <div className="mt-1 font-mono tnum text-workshop-text">
            {model.architecture === "moe"
              ? fmtParams(model.activeParamsB)
              : "all (dense)"}
          </div>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
            on-disk
          </div>
          <div className="mt-1 font-mono tnum text-workshop-text">
            {fmtSize(model.sizeGB)}
          </div>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
            released
          </div>
          <div className="mt-1 font-mono tnum text-workshop-muted">
            {model.releasedAt ?? "—"}
          </div>
        </div>
        <div className="col-span-2 md:col-span-4">
          <div className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
            license
          </div>
          <div className="mt-1 font-mono text-workshop-text">
            {model.license ?? "—"}
          </div>
        </div>
      </section>

      {/* Live perf */}
      <section className="mb-8">
        <h2 className="mb-3 font-heading text-xl font-semibold">
          Live throughput
        </h2>
        {perf.length === 0 ? (
          <div className="rounded border border-dashed border-workshop-muted/25 bg-workshop-surface/40 p-6 text-center font-mono text-sm text-workshop-muted">
            no benchmark samples yet — first race against this model will
            populate this panel
          </div>
        ) : (
          <div className="space-y-3 rounded border border-workshop-muted/25 bg-workshop-surface/40 p-5">
            <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
              <span>tokens/sec per GPU · higher = cheaper</span>
              <span className="tnum text-workshop-text">
                top: {fmtTokps(topTps)} on {perf[0]?.gpuType ?? perf[0]?.gpuId}
              </span>
            </div>
            {perf.map((r) => {
              const widthPct = Math.min(
                100,
                Math.max(3, (r.tokenPerSec / bestTps) * 100),
              );
              const barTone =
                model.family === "qwen"
                  ? "bg-workshop-primary"
                  : model.family === "llama"
                    ? "bg-workshop-command"
                    : "bg-workshop-secondary";
              return (
                <div key={r.gpuId} className="space-y-1.5">
                  <div className="flex items-baseline justify-between text-[13px]">
                    <span className="font-mono text-workshop-text">
                      {r.gpuType ?? r.gpuId}
                    </span>
                    <span className="flex gap-3 font-mono">
                      <span className="tnum text-workshop-text">
                        {fmtTokps(r.tokenPerSec)} tok/s
                      </span>
                      <span className="tnum text-workshop-muted">
                        {fmtUsd(r.costPerMillionTokensUsd)}/M
                      </span>
                    </span>
                  </div>
                  <div className="relative h-2 overflow-hidden rounded bg-workshop-muted/15">
                    <div
                      className={`absolute inset-y-0 left-0 rounded ${barTone}`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
                    {r.progressSamples} progress samples
                    {r.scoreSamples > 0 && ` · ${r.scoreSamples} score rows`}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Notes */}
      {model.notes && (
        <section className="mb-8 rounded border border-workshop-muted/20 bg-workshop-surface/30 p-5">
          <div className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
            notes
          </div>
          <p className="mt-2 text-[14px] leading-relaxed text-workshop-text/90">
            {model.notes}
          </p>
        </section>
      )}

      {/* Pull it yourself */}
      <section className="mb-8">
        <h2 className="mb-3 font-heading text-xl font-semibold">
          Pull it yourself
        </h2>
        <p className="mb-3 text-[14px] leading-relaxed text-workshop-text/90">
          These weights are on the Ollama public registry. One command to
          have the same model running on your hardware:
        </p>
        <pre className="overflow-x-auto rounded border border-workshop-command/40 bg-workshop-bg/60 p-4 font-mono text-[13px] text-workshop-command">
          <code>{pullCmd}</code>
        </pre>
      </section>

      <nav className="border-t border-workshop-muted/20 pt-6 font-mono text-[11px] uppercase tracking-wider text-workshop-muted">
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/models" className="hover:text-workshop-primary">
            ← all models
          </Link>
          <Link href="/models/catalog" className="hover:text-workshop-primary">
            raw catalog
          </Link>
          <Link
            href="/research/how-it-works"
            className="hover:text-workshop-primary"
          >
            how local AI works
          </Link>
          <Link
            href="/research/cost-calc"
            className="hover:text-workshop-primary"
          >
            cost calculator
          </Link>
        </div>
      </nav>
    </main>
  );
}
