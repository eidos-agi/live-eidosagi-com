"use client";

import { useCallback, useEffect, useState } from "react";

interface HumanTask {
  id: number;
  ts: string;
  sessionId: string;
  title: string;
  details: Record<string, unknown>;
  status: "open" | "done" | "wontdo" | "blocked";
  priority: "low" | "normal" | "high" | "urgent";
  url: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

interface Counts {
  open: number;
  done: number;
  wontdo: number;
  blocked: number;
}

interface Props {
  initialTasks: HumanTask[];
  initialCounts: Counts;
}

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

function priorityPill(p: HumanTask["priority"]): string {
  switch (p) {
    case "urgent":
      return "border-workshop-danger/50 text-workshop-danger";
    case "high":
      return "border-workshop-primary/60 text-workshop-primary";
    case "low":
      return "border-workshop-muted/40 text-workshop-muted";
    default:
      return "border-workshop-muted/40 text-workshop-text";
  }
}

export default function HumanTasksBoard({
  initialTasks,
  initialCounts,
}: Props) {
  const [tasks, setTasks] = useState<HumanTask[]>(initialTasks);
  const [counts, setCounts] = useState<Counts>(initialCounts);
  const [busy, setBusy] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/human-tasks?status=open", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        tasks: HumanTask[];
        counts: Counts;
      };
      setTasks(data.tasks);
      setCounts(data.counts);
    } catch {
      // ignore; next tick retries
    }
  }, []);

  useEffect(() => {
    const id = setInterval(refresh, 8000);
    return () => clearInterval(id);
  }, [refresh]);

  const resolve = useCallback(
    async (id: number, status: "done" | "wontdo" | "blocked") => {
      setBusy(id);
      try {
        await fetch("/api/human-tasks", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id, status }),
        });
        await refresh();
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  if (tasks.length === 0) {
    return (
      <div className="rounded border border-dashed border-workshop-muted/30 bg-workshop-surface/50 p-8 text-center">
        <div className="font-heading text-lg text-workshop-command">
          inbox zero
        </div>
        <p className="mt-2 text-sm text-workshop-muted">
          Nothing waiting on a human right now. The agent will drop things
          here as it hits them.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-workshop-muted/15 overflow-hidden rounded border border-workshop-muted/20 bg-workshop-surface/50">
      {tasks.map((t) => {
        const dKeys = Object.keys(t.details || {});
        return (
          <li key={t.id} className="p-4">
            <div className="flex items-start gap-3">
              <span
                className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${priorityPill(
                  t.priority,
                )}`}
              >
                {t.priority}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-heading text-base text-workshop-text">
                  {t.title}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
                  <span className="tnum">{relativeTime(t.ts)}</span>
                  <span>·</span>
                  <span className="truncate">{t.sessionId}</span>
                  {t.url && (
                    <>
                      <span>·</span>
                      <a
                        href={t.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-workshop-primary hover:underline"
                      >
                        open link →
                      </a>
                    </>
                  )}
                </div>
                {dKeys.length > 0 && (
                  <pre className="mt-2 overflow-x-auto rounded border border-workshop-muted/15 bg-workshop-bg/60 p-2 font-mono text-[11px] text-workshop-command">
                    {JSON.stringify(t.details, null, 2)}
                  </pre>
                )}
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  type="button"
                  onClick={() => resolve(t.id, "done")}
                  disabled={busy === t.id}
                  className="rounded border border-workshop-command/50 bg-workshop-command/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-workshop-command transition hover:bg-workshop-command/20 disabled:opacity-40"
                >
                  {busy === t.id ? "…" : "done"}
                </button>
                <button
                  type="button"
                  onClick={() => resolve(t.id, "wontdo")}
                  disabled={busy === t.id}
                  className="rounded border border-workshop-muted/40 bg-transparent px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-workshop-muted transition hover:border-workshop-muted hover:text-workshop-text disabled:opacity-40"
                >
                  won&apos;t
                </button>
              </div>
            </div>
          </li>
        );
      })}

      <li className="flex items-center justify-between border-t border-workshop-muted/15 bg-workshop-bg/30 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
        <span>
          {counts.open} open · {counts.done} done · {counts.blocked} blocked ·{" "}
          {counts.wontdo} won&apos;t do
        </span>
        <button
          type="button"
          onClick={() => refresh()}
          className="hover:text-workshop-primary"
        >
          refresh
        </button>
      </li>
    </ul>
  );
}
