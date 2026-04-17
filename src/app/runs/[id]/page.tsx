import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getRun,
  listProgressForRun,
  listScoresForRun,
} from "@/lib/db";

export const dynamic = "force-dynamic";

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - Date.parse(iso);
  if (!Number.isFinite(diff)) return "—";
  const s = Math.max(0, Math.floor(diff / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function fmtUsd(n: number | null): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return "—";
  if (n < 0.1) return `$${n.toFixed(3)}`;
  if (n < 10) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(1)}`;
}

interface LaneStat {
  gpuId: string;
  gpuType: string | null;
  costPerHour: number | null;
  tokPerSec: number;
  latencyMs: number;
  costPerMillionUsd: number | null;
}

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let run;
  try {
    run = getRun(id);
  } catch {
    run = null;
  }
  if (!run) notFound();

  const progress = listProgressForRun(run.id);
  const scores = listScoresForRun(run.id);

  // Aggregate per-lane (one row per GPU) — mean tok/s + mean latency.
  const byGpu = new Map<string, { tokSum: number; tokN: number; latSum: number; latN: number }>();
  for (const p of progress) {
    if (!byGpu.has(p.gpuId))
      byGpu.set(p.gpuId, { tokSum: 0, tokN: 0, latSum: 0, latN: 0 });
    const b = byGpu.get(p.gpuId)!;
    if (Number.isFinite(p.tokPerSec ?? NaN) && (p.tokPerSec ?? 0) > 0) {
      b.tokSum += p.tokPerSec ?? 0;
      b.tokN += 1;
    }
    if (Number.isFinite(p.latencyMs ?? NaN) && (p.latencyMs ?? 0) > 0) {
      b.latSum += p.latencyMs ?? 0;
      b.latN += 1;
    }
  }
  const lanes: LaneStat[] = run.gpus.map((g) => {
    const b = byGpu.get(g.name) ?? { tokSum: 0, tokN: 0, latSum: 0, latN: 0 };
    const tok = b.tokN > 0 ? b.tokSum / b.tokN : 0;
    const lat = b.latN > 0 ? b.latSum / b.latN : 0;
    const cost =
      (g.costPerHour as number | undefined) ?? null;
    let perMillion: number | null = null;
    if (cost != null && tok > 0) {
      perMillion = Math.round((cost / (tok * 3600)) * 1_000_000 * 100) / 100;
    }
    return {
      gpuId: g.name,
      gpuType: (g.type as string | undefined) ?? null,
      costPerHour: cost,
      tokPerSec: Math.round(tok * 10) / 10,
      latencyMs: Math.round(lat * 10) / 10,
      costPerMillionUsd: perMillion,
    };
  });

  // Winner = highest tok/s
  const winner = lanes.reduce<LaneStat | null>(
    (best, l) => (!best || l.tokPerSec > best.tokPerSec ? l : best),
    null,
  );

  const durationMs =
    run.endedAt != null
      ? Date.parse(run.endedAt) - Date.parse(run.startedAt)
      : null;

  return (
    <article className="space-y-6">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
          run detail
        </p>
        <h1 className="mt-1 font-heading text-3xl font-bold text-workshop-text">
          {run.id}
        </h1>
        {run.promptLabel && (
          <p className="mt-1 text-sm text-workshop-primary">
            {run.promptLabel}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-4 font-mono text-[11px] uppercase tracking-wider text-workshop-muted">
          <span>
            started{" "}
            <span className="tnum text-workshop-text">
              {relativeTime(run.startedAt)}
            </span>
          </span>
          <span>
            ended{" "}
            <span className="tnum text-workshop-text">
              {run.endedAt ? relativeTime(run.endedAt) : "— live —"}
            </span>
          </span>
          {durationMs != null && (
            <span>
              duration{" "}
              <span className="tnum text-workshop-text">
                {durationMs < 60_000
                  ? `${Math.round(durationMs / 1000)}s`
                  : `${Math.round(durationMs / 60_000)}m`}
              </span>
            </span>
          )}
          <span>
            status{" "}
            <span
              className={
                run.endedAt
                  ? "text-workshop-muted"
                  : "text-workshop-command"
              }
            >
              {run.endedAt ? run.status : "● live"}
            </span>
          </span>
          <span>
            session{" "}
            <span className="tnum text-workshop-text">{run.sessionId ?? "—"}</span>
          </span>
        </div>
      </header>

      <section className="space-y-2">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-workshop-muted">
          lanes
        </h2>
        <div className="overflow-hidden rounded border border-workshop-muted/20 bg-workshop-surface/50">
          <table className="w-full text-left text-sm">
            <thead className="bg-workshop-bg/40 font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
              <tr>
                <th className="px-4 py-3">gpu</th>
                <th className="px-4 py-3 text-right">tok/s</th>
                <th className="px-4 py-3 text-right">latency (ms)</th>
                <th className="px-4 py-3 text-right">$/hr</th>
                <th className="px-4 py-3 text-right">$/1M tokens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-workshop-muted/15">
              {lanes.map((l) => {
                const isWinner = winner?.gpuId === l.gpuId && l.tokPerSec > 0;
                return (
                  <tr
                    key={l.gpuId}
                    className={
                      isWinner ? "bg-workshop-command/5" : ""
                    }
                  >
                    <td className="px-4 py-3 font-mono">
                      <span
                        className={
                          isWinner
                            ? "text-workshop-command"
                            : "text-workshop-text"
                        }
                      >
                        {l.gpuType ?? l.gpuId}
                      </span>
                      {isWinner && (
                        <span className="ml-2 rounded border border-workshop-command/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-workshop-command">
                          winner
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tnum text-workshop-text">
                      {l.tokPerSec > 0 ? l.tokPerSec.toFixed(1) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tnum text-workshop-muted">
                      {l.latencyMs > 0 ? l.latencyMs.toFixed(0) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tnum text-workshop-muted">
                      {l.costPerHour != null
                        ? `$${l.costPerHour.toFixed(2)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tnum text-workshop-primary">
                      {fmtUsd(l.costPerMillionUsd)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {scores.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-workshop-muted">
            eval scores · {scores.length}
          </h2>
          <p className="text-sm text-workshop-muted">
            Rubric-scored quality measurements on this run&apos;s model
            outputs. Higher composite = better.
          </p>
          <div className="overflow-hidden rounded border border-workshop-muted/20 bg-workshop-surface/50">
            <table className="w-full text-left text-sm">
              <thead className="bg-workshop-bg/40 font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
                <tr>
                  <th className="px-4 py-2">model</th>
                  <th className="px-4 py-2">use case</th>
                  <th className="px-4 py-2">test</th>
                  <th className="px-4 py-2 text-right">composite</th>
                  <th className="px-4 py-2 text-right">tok/s</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-workshop-muted/15">
                {scores.slice(0, 40).map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2 font-mono text-[12px] text-workshop-text">
                      {s.model}
                    </td>
                    <td className="px-4 py-2 text-[12px] text-workshop-text">
                      {s.useCase}
                    </td>
                    <td className="px-4 py-2 font-mono text-[11px] text-workshop-muted">
                      {s.testCaseId ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tnum text-workshop-command">
                      {s.composite != null ? s.composite.toFixed(1) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tnum text-workshop-muted">
                      {s.tokPerSec != null ? s.tokPerSec.toFixed(1) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {scores.length > 40 && (
              <div className="border-t border-workshop-muted/15 bg-workshop-bg/30 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
                showing 40 of {scores.length}
              </div>
            )}
          </div>
        </section>
      )}

      <nav className="border-t border-workshop-muted/20 pt-6">
        <ul className="flex flex-wrap gap-4 font-mono text-[11px] uppercase tracking-wider text-workshop-muted">
          <li>
            <Link
              href={`/runs/${run.id}/narrative`}
              className="hover:text-workshop-primary"
            >
              narrative →
            </Link>
          </li>
          <li>
            <Link href="/runs" className="hover:text-workshop-primary">
              all runs →
            </Link>
          </li>
          <li>
            <Link
              href={`/api/raw/progress?runId=${encodeURIComponent(run.id)}`}
              className="hover:text-workshop-primary"
            >
              raw json →
            </Link>
          </li>
        </ul>
      </nav>
    </article>
  );
}
