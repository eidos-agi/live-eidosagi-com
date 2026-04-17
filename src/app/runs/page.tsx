import Link from "next/link";
import { getDb, listRuns as listRunsDb, type Run } from "@/lib/db";

export const dynamic = "force-dynamic";

function relativeTime(iso: string): string {
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

function headlineTokForRun(runId: string): {
  peak: number;
  peakGpu: string | null;
} {
  try {
    const db = getDb();
    const row = db
      .prepare(
        `SELECT gpu_id, MAX(tok_per_sec) AS peak
           FROM progress
          WHERE run_id = ? AND tok_per_sec IS NOT NULL
          GROUP BY gpu_id
          ORDER BY peak DESC
          LIMIT 1`,
      )
      .get(runId) as { gpu_id: string; peak: number } | undefined;
    if (!row) return { peak: 0, peakGpu: null };
    return { peak: Number(row.peak || 0), peakGpu: row.gpu_id };
  } catch {
    return { peak: 0, peakGpu: null };
  }
}

export default function RunsIndex() {
  let runs: Run[] = [];
  try {
    runs = listRunsDb(50);
  } catch {
    // keep empty
  }

  const rows = runs.map((run) => {
    const { peak, peakGpu } = headlineTokForRun(run.id);
    return { run, peak, peakGpu };
  });

  const liveCount = rows.filter((r) => !r.run.endedAt).length;

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-baseline justify-between">
          <h1 className="font-heading text-3xl font-bold text-workshop-text">
            Run history
          </h1>
          <span className="font-mono text-[11px] uppercase tracking-wider text-workshop-muted">
            {rows.length} runs{liveCount > 0 ? ` · ${liveCount} live` : ""}
          </span>
        </div>
        <p className="mt-1 text-sm text-workshop-muted">
          Every completed race — backfilled Thunder benchmarks and live-racer
          cross-GPU runs, newest first.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded border border-dashed border-workshop-muted/25 bg-workshop-surface/50 p-8 text-center text-sm text-workshop-muted">
          No runs yet. Start one and POST to{" "}
          <code className="rounded bg-workshop-bg px-1.5 py-0.5 font-mono text-workshop-command">
            /api/ingest
          </code>
          .
        </div>
      ) : (
        <div className="overflow-hidden rounded border border-workshop-muted/20 bg-workshop-surface/50">
          <table className="w-full text-left text-sm">
            <thead className="bg-workshop-bg/40 font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
              <tr>
                <th className="px-4 py-3">run</th>
                <th className="px-4 py-3">started</th>
                <th className="px-4 py-3">gpus</th>
                <th className="px-4 py-3">models</th>
                <th className="px-4 py-3 text-right">peak tok/s</th>
                <th className="px-4 py-3 text-right">status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-workshop-muted/15">
              {rows.map(({ run, peak, peakGpu }) => (
                <tr
                  key={run.id}
                  className="transition-colors hover:bg-workshop-primary/5"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/runs/${run.id}`}
                      className="font-mono text-workshop-primary hover:underline"
                    >
                      {run.id}
                    </Link>
                    {run.promptLabel ? (
                      <span className="ml-2 text-xs text-workshop-muted">
                        {run.promptLabel}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-workshop-muted tnum">
                    {relativeTime(run.startedAt)}
                  </td>
                  <td className="px-4 py-3 text-workshop-text">
                    {run.gpus.map((g) => g.type ?? g.name).join(" · ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-workshop-text">
                    {run.models.join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tnum text-workshop-text">
                    {peak > 0 ? (
                      <>
                        <span className="text-workshop-command">
                          {peak.toFixed(1)}
                        </span>
                        {peakGpu && (
                          <span className="ml-1 text-[11px] text-workshop-muted">
                            {peakGpu.replace(/^thunder-/, "")}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-workshop-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {run.endedAt ? (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
                        {run.status}
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-workshop-command">
                        ● live
                      </span>
                    )}
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
