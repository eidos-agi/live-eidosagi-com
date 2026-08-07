// /models — DB-backed, SSR. Each model gets a card that joins registry
// metadata (family, arch, size, release, license, role) with live
// benchmark perf (tok/s per GPU, $/M-tokens). One query per table,
// no client-side fetch. Sibling: /models/catalog (raw registry table).

import Link from "next/link";
import { listModels, type ModelRow } from "@/lib/db";
import { buildLeaderboard, type LeaderboardRow } from "@/lib/leaderboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Models · live.eidosagi.com",
  description:
    "Every model we've pulled on the H100, with live benchmark throughput and cost per million tokens. Sourced from the SQLite registry + progress/scores tables.",
};

// ────────────────────────── formatting helpers ──────────────────────────

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

// Tiny pill telling a visitor whether a model is commercial-safe. Intentionally
// short — the nuance lives in the tooltip (model.notesCommercial) and the
// per-model detail page's license field.
function commercialPill(
  commercialUse: "yes" | "yes-with-restrictions" | "no" | "research-only" | null,
  tooltip: string | null,
): { label: string; cls: string; tip: string } | null {
  if (!commercialUse) return null;
  const tip = tooltip ?? "commercial-use status for this model";
  switch (commercialUse) {
    case "yes":
      return {
        label: "ship it",
        cls: "border-workshop-command/60 text-workshop-command bg-workshop-command/5",
        tip,
      };
    case "yes-with-restrictions":
      return {
        label: "caveats",
        cls: "border-workshop-primary/60 text-workshop-primary bg-workshop-primary/5",
        tip,
      };
    case "research-only":
      return {
        label: "research-only",
        cls: "border-workshop-danger/50 text-workshop-danger bg-workshop-danger/5",
        tip,
      };
    case "no":
      return {
        label: "non-commercial",
        cls: "border-workshop-danger/60 text-workshop-danger bg-workshop-danger/10",
        tip,
      };
  }
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

// ─────────────────────────────── page ───────────────────────────────────

interface ModelCard {
  model: ModelRow;
  perf: LeaderboardRow[]; // one per GPU that has run it
}

function groupPerf(
  leaderboard: LeaderboardRow[],
  modelName: string,
): LeaderboardRow[] {
  return leaderboard
    .filter((r) => r.model === modelName && r.progressSamples > 0)
    .sort((a, b) => b.tokenPerSec - a.tokenPerSec);
}

export default async function ModelsPage() {
  const [models, leaderboard] = await Promise.all([
    Promise.resolve(listModels()),
    buildLeaderboard(),
  ]);

  const cards: ModelCard[] = models
    .filter((m) => !m.name.endsWith(":latest")) // hide aliases
    .map((m) => ({ model: m, perf: groupPerf(leaderboard, m.name) }));

  const bestTps = Math.max(
    1,
    ...leaderboard.map((r) => (r.progressSamples > 0 ? r.tokenPerSec : 0)),
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 text-workshop-text">
      <header className="mb-8">
        <div className="flex items-baseline gap-4">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Models
          </h1>
          <span className="font-mono text-xs uppercase tracking-wider text-workshop-muted">
            {cards.length} weights on H100 · benchmarks live from SQLite
          </span>
        </div>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-workshop-text/90">
          Every model we&apos;ve pulled, with what it <em>is</em> (registry)
          and what it <em>does</em> (benchmarks). One SSR query per table,
          joined in memory, no client-side fetch. Fastest GPU wins the model&apos;s throughput row.
        </p>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-workshop-muted">
          see also:{" "}
          <Link href="/models/catalog" className="text-workshop-primary hover:underline">
            raw catalog
          </Link>{" "}
          ·{" "}
          <Link href="/api/models" className="hover:underline">
            /api/models
          </Link>{" "}
          ·{" "}
          <Link href="/api/models/catalog" className="hover:underline">
            /api/models/catalog
          </Link>
        </p>
      </header>

      {cards.length === 0 ? (
        <div className="rounded border border-workshop-muted/30 bg-workshop-surface/40 p-8 text-center font-mono text-sm text-workshop-muted">
          no models registered yet — migration 005 hasn&apos;t run on this DB.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {cards.map(({ model, perf }) => {
            const tone = familyTone(model.family);
            const topTps = perf[0]?.tokenPerSec ?? 0;
            const topGpu = perf[0]?.gpuType ?? null;
            return (
              <li
                key={model.name}
                className={`relative flex flex-col rounded border bg-workshop-surface/50 p-5 transition hover:bg-workshop-surface ${
                  model.defaultInHarness
                    ? "border-workshop-command/50 shadow-[0_0_24px_rgba(184,196,160,0.10)]"
                    : "border-workshop-muted/25"
                }`}
              >
                {/* Header — name + family chip + role pills */}
                <header className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2
                      className={`truncate font-mono text-[15px] font-semibold ${tone.accent}`}
                      title={model.name}
                    >
                      {model.name}
                    </h2>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
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
                          race
                        </span>
                      )}
                      {(() => {
                        const pill = commercialPill(
                          model.commercialUse,
                          model.notesCommercial,
                        );
                        return pill ? (
                          <span
                            title={pill.tip}
                            className={`inline-block rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${pill.cls}`}
                          >
                            {pill.label}
                          </span>
                        ) : null;
                      })()}
                    </div>
                  </div>
                </header>

                {/* Specs row */}
                <dl className="mt-4 grid grid-cols-4 gap-3 text-[12px]">
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
                      params
                    </dt>
                    <dd className="mt-0.5 font-mono tnum text-workshop-text">
                      {fmtParams(model.totalParamsB)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
                      active
                    </dt>
                    <dd className="mt-0.5 font-mono tnum text-workshop-text">
                      {model.architecture === "moe"
                        ? fmtParams(model.activeParamsB)
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
                      size
                    </dt>
                    <dd className="mt-0.5 font-mono tnum text-workshop-text">
                      {fmtSize(model.sizeGB)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
                      released
                    </dt>
                    <dd className="mt-0.5 font-mono tnum text-workshop-muted">
                      {model.releasedAt ?? "—"}
                    </dd>
                  </div>
                </dl>

                {/* Perf band — tok/s bar + cost/M per GPU */}
                <section className="mt-5 rounded border border-workshop-muted/15 bg-workshop-bg/40 p-3">
                  {perf.length === 0 ? (
                    <p className="font-mono text-[11px] uppercase tracking-wider text-workshop-muted">
                      no benchmark samples yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
                        <span>live throughput</span>
                        <span className="tnum text-workshop-text">
                          {fmtTokps(topTps)} tok/s on {topGpu}
                        </span>
                      </div>
                      {perf.map((r) => {
                        const widthPct = Math.min(
                          100,
                          Math.max(3, (r.tokenPerSec / bestTps) * 100),
                        );
                        return (
                          <div key={`${r.model}-${r.gpuId}`} className="space-y-1">
                            <div className="flex items-baseline justify-between font-mono text-[11px] text-workshop-muted">
                              <span>{r.gpuType ?? r.gpuId}</span>
                              <span className="flex gap-3">
                                <span className="tnum text-workshop-text">
                                  {fmtTokps(r.tokenPerSec)} tok/s
                                </span>
                                <span className="tnum">
                                  {fmtUsd(r.costPerMillionTokensUsd)}/M
                                </span>
                              </span>
                            </div>
                            <div className="relative h-1.5 overflow-hidden rounded bg-workshop-muted/15">
                              <div
                                className={`absolute inset-y-0 left-0 rounded ${
                                  model.family === "qwen"
                                    ? "bg-workshop-primary"
                                    : model.family === "llama"
                                      ? "bg-workshop-command"
                                      : "bg-workshop-secondary"
                                }`}
                                style={{ width: `${widthPct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* License + notes footer */}
                <footer className="mt-4 flex items-baseline justify-between gap-3 text-[11px] text-workshop-muted">
                  <span className="font-mono">{model.license ?? "—"}</span>
                  {model.notes && (
                    <span className="truncate text-right italic" title={model.notes}>
                      {model.notes}
                    </span>
                  )}
                </footer>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
