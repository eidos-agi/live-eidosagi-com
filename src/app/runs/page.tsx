import Link from "next/link";
import { listRuns, readEvents } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function RunsIndex() {
  const runs = await listRuns();
  // Compute headline tok/s per run (max across all events). Cheap enough at
  // current scale; revisit if runs grow beyond ~1MB of events.
  const rows = await Promise.all(
    runs.map(async (run) => {
      const events = await readEvents(run.id);
      const headline = events.reduce(
        (max, e) => (e.tokenPerSec > max ? e.tokenPerSec : max),
        0,
      );
      return { run, headline };
    }),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Run History</h1>
        <p className="mt-1 text-sm text-gray-400">
          Every benchmark run that has ingested events.
        </p>
      </header>
      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-bg-border bg-bg-raised p-8 text-center text-sm text-gray-400">
          No runs yet. Start one and POST to <code>/api/ingest</code>.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-bg-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg-raised text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Run</th>
                <th className="px-4 py-3">Started</th>
                <th className="px-4 py-3">GPUs</th>
                <th className="px-4 py-3">Models</th>
                <th className="px-4 py-3 text-right">Headline tok/s</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bg-border">
              {rows.map(({ run, headline }) => (
                <tr key={run.id} className="hover:bg-bg-raised/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/runs/${run.id}`}
                      className="font-mono text-blue-300 hover:underline"
                    >
                      {run.id}
                    </Link>
                    {run.label ? (
                      <span className="ml-2 text-xs text-gray-500">
                        {run.label}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(run.startedAt).toISOString().slice(0, 19) + "Z"}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {run.gpus.map((g) => g.type).join(" · ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {run.models.join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-100 tabular-nums">
                    {headline > 0 ? headline.toFixed(1) : "—"}
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
