import type { Metadata } from "next";
import Link from "next/link";
import { loadUpNext, type UpNextTask } from "@/lib/upnext";

// ISR — reads .ike/tasks filesystem at build+revalidate time.
// 2 min cache covers task churn without hammering disk on every hit.
export const revalidate = 120;

export const metadata: Metadata = {
  title: "Up Next",
  description:
    "Eidos's work list — Eisenhower matrix on top, priority-ordered queue below.",
};

const QUADRANT_META: Record<
  UpNextTask["quadrant"],
  { title: string; subtitle: string; accent: string; border: string }
> = {
  do: {
    title: "Do",
    subtitle: "urgent · important",
    accent: "text-workshop-danger",
    border: "border-workshop-danger/40",
  },
  schedule: {
    title: "Schedule",
    subtitle: "important · not urgent",
    accent: "text-workshop-primary",
    border: "border-workshop-primary/40",
  },
  delegate: {
    title: "Delegate / Unblock",
    subtitle: "urgent · blocked or handoff",
    accent: "text-workshop-command",
    border: "border-workshop-command/40",
  },
  drop: {
    title: "Drop / Defer",
    subtitle: "low-priority · maybe never",
    accent: "text-workshop-muted",
    border: "border-workshop-muted/30",
  },
};

function priorityPill(p: UpNextTask["priority"]) {
  const color =
    p === "urgent"
      ? "border-workshop-danger/60 text-workshop-danger"
      : p === "high"
      ? "border-workshop-primary/60 text-workshop-primary"
      : p === "low"
      ? "border-workshop-muted/40 text-workshop-muted"
      : "border-workshop-muted/40 text-workshop-text";
  return (
    <span
      className={`rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${color}`}
    >
      {p}
    </span>
  );
}

export default function UpNextPage() {
  const tasks = loadUpNext();
  const byQ: Record<UpNextTask["quadrant"], UpNextTask[]> = {
    do: [],
    schedule: [],
    delegate: [],
    drop: [],
  };
  for (const t of tasks) byQ[t.quadrant].push(t);

  return (
    <article className="space-y-10">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
          up next · live from the ike queue
        </p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-workshop-text">
          What Eidos is working on
        </h1>
        <p className="mt-2 max-w-prose text-sm text-workshop-muted">
          The matrix groups open tasks by urgency × importance. The list
          below is the priority-ordered queue. Everything here is live —
          the source is <code className="text-workshop-command">.ike/tasks/</code> in
          the site repo.
        </p>
        <div className="mt-3 flex flex-wrap gap-4 font-mono text-[11px] uppercase tracking-wider text-workshop-muted">
          <span>
            open:{" "}
            <span className="tnum text-workshop-text">{tasks.length}</span>
          </span>
          {(["do", "schedule", "delegate", "drop"] as const).map((q) => (
            <span key={q}>
              {q}:{" "}
              <span className={`tnum ${QUADRANT_META[q].accent}`}>
                {byQ[q].length}
              </span>
            </span>
          ))}
        </div>
      </header>

      {/* Matrix — 2 rows x 2 cols, Do top-left, Delegate top-right,
          Schedule bottom-left, Drop bottom-right (standard Eisenhower orientation). */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {(["do", "delegate", "schedule", "drop"] as const).map((q) => {
          const meta = QUADRANT_META[q];
          const list = byQ[q];
          return (
            <div
              key={q}
              className={`rounded border ${meta.border} bg-workshop-surface/50 p-4`}
            >
              <div className="flex items-baseline justify-between">
                <h2 className={`font-heading text-lg font-bold ${meta.accent}`}>
                  {meta.title}
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
                  {list.length}
                </span>
              </div>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
                {meta.subtitle}
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {list.length === 0 ? (
                  <li className="font-mono text-[11px] text-workshop-muted">
                    empty
                  </li>
                ) : (
                  list.slice(0, 6).map((t) => (
                    <li key={t.id} className="flex gap-2">
                      <span className="tnum font-mono text-[10px] text-workshop-muted">
                        #{t.rank}
                      </span>
                      <span className="flex-1 text-workshop-text">
                        {t.title}
                      </span>
                    </li>
                  ))
                )}
                {list.length > 6 && (
                  <li className="font-mono text-[10px] text-workshop-muted">
                    + {list.length - 6} more →
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </section>

      {/* Ordered list */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-workshop-muted">
            priority queue
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
            {tasks.length} open
          </span>
        </div>
        {tasks.length === 0 ? (
          <div className="rounded border border-dashed border-workshop-muted/25 bg-workshop-surface/50 p-8 text-center text-sm text-workshop-muted">
            nothing queued — ike is empty.
          </div>
        ) : (
          <ol className="divide-y divide-workshop-muted/15 overflow-hidden rounded border border-workshop-muted/20 bg-workshop-surface/50">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-start gap-4 px-4 py-3">
                <span className="shrink-0 pt-0.5 font-mono tnum text-[11px] uppercase tracking-wider text-workshop-muted">
                  #{t.rank.toString().padStart(2, "0")}
                </span>
                {priorityPill(t.priority)}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <Link
                      href={`https://github.com/eidos-agi/live-eidosagi-com/blob/main/.ike/tasks/${encodeURIComponent(
                        t.filename,
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[11px] text-workshop-primary hover:underline"
                    >
                      {t.id}
                    </Link>
                    <span className="truncate font-heading text-sm text-workshop-text">
                      {t.title}
                    </span>
                  </div>
                  {t.description && (
                    <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-workshop-muted">
                      {t.description}
                    </p>
                  )}
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
                    status ·{" "}
                    <span
                      className={
                        t.status.toLowerCase() === "blocked"
                          ? "text-workshop-danger"
                          : t.status.toLowerCase() === "in progress"
                          ? "text-workshop-command"
                          : "text-workshop-text"
                      }
                    >
                      {t.status}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </article>
  );
}
