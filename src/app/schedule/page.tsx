import { readSchedule } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Schedule — Eidos Live",
  description: "Upcoming GPU benchmark races on live.eidosagi.com",
};

function formatCountdown(iso: string): string {
  const ms = Date.parse(iso) - Date.now();
  if (ms <= 0) return "live now / just past";
  const s = Math.floor(ms / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  if (days > 0) return `in ${days}d ${hours}h`;
  if (hours > 0) return `in ${hours}h ${mins}m`;
  return `in ${mins}m`;
}

export default async function SchedulePage() {
  const schedule = await readSchedule();
  const sorted = [...schedule].sort(
    (a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt),
  );
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-heading text-3xl font-bold text-workshop-text">
          Upcoming Runs
        </h1>
        <p className="text-sm text-workshop-muted">
          Next ignitions on the three-lane GPU race. Subscribe to the{" "}
          <a
            href="/schedule.rss"
            className="text-workshop-primary hover:underline"
          >
            RSS feed
          </a>{" "}
          to get notified.
        </p>
      </header>

      {sorted.length === 0 ? (
        <div className="rounded border border-dashed border-workshop-muted/25 bg-workshop-surface/50 p-8 text-center text-sm text-workshop-muted">
          No runs scheduled. Check back soon.
        </div>
      ) : (
        <ol className="space-y-3">
          {sorted.map((run) => {
            const startDate = new Date(run.startsAt);
            const isPast = Date.now() > Date.parse(run.startsAt);
            return (
              <li
                key={run.id}
                id={run.id}
                className="rounded border border-workshop-muted/20 bg-workshop-surface p-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                  <h2 className="font-heading text-lg font-bold text-workshop-text">
                    {run.label}
                  </h2>
                  <div className="font-mono text-xs text-workshop-primary tnum">
                    {formatCountdown(run.startsAt)}
                  </div>
                </div>
                <div className="mt-1 font-mono text-xs text-workshop-muted tnum">
                  {startDate
                    .toISOString()
                    .replace("T", " ")
                    .replace(".000Z", " UTC")}
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
                      model
                    </dt>
                    <dd className="text-workshop-text">{run.model}</dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
                      gpus
                    </dt>
                    <dd className="text-workshop-text">{run.gpus.join(" · ")}</dd>
                  </div>
                  {run.prompt && (
                    <div className="col-span-2 md:col-span-1">
                      <dt className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
                        workload
                      </dt>
                      <dd className="text-workshop-text">{run.prompt}</dd>
                    </div>
                  )}
                </dl>
                {isPast && (
                  <div className="mt-3 font-mono text-[10px] uppercase tracking-wider text-workshop-danger">
                    archived — see /runs
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
