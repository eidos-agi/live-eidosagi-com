"use client";

import { useEffect, useState } from "react";

interface ScheduleItem {
  id: string;
  startsAt: string;
  model: string;
  gpus: string[];
  label: string;
}

interface RunSummary {
  id: string;
  label?: string;
  startedAt: string;
  endedAt: string | null;
  models: string[];
}

type Status = "NOW RUNNING" | "IDLE" | "COOLING";

function formatCountdown(ms: number): string {
  if (ms <= 0) return "imminent";
  const s = Math.floor(ms / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (days > 0) return `in ${days}d ${hours}h`;
  if (hours > 0) return `in ${hours}h ${mins}m`;
  if (mins > 0) return `in ${mins}m ${secs}s`;
  return `in ${secs}s`;
}

/**
 * Persistent strip: status chip | run context | ISO UTC clock.
 * Polls /api/runs and /api/schedule every 15s; clock ticks every second.
 */
export default function StatusStrip() {
  const [now, setNow] = useState<Date>(new Date());
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);

  // Clock — tick every second.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Poll runs + schedule every 15s.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [runsRes, schedRes] = await Promise.all([
          fetch("/api/runs", { cache: "no-store" }),
          fetch("/api/schedule", { cache: "no-store" }),
        ]);
        if (cancelled) return;
        if (runsRes.ok) {
          const json: { runs?: RunSummary[] } = await runsRes.json();
          setRuns(json.runs ?? []);
        }
        if (schedRes.ok) {
          const json: { schedule?: ScheduleItem[] } = await schedRes.json();
          setSchedule(json.schedule ?? []);
        }
      } catch {
        /* graceful */
      }
    }

    load();
    const id = setInterval(load, 15_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const liveRun = runs.find((r) => r.endedAt == null) ?? null;
  const lastRun = runs.find((r) => r.endedAt != null) ?? null;
  const coolingWindow = 10 * 60 * 1000; // 10 minutes post-run = "cooling"
  const isCooling =
    !liveRun &&
    lastRun?.endedAt &&
    Date.now() - Date.parse(lastRun.endedAt) < coolingWindow;

  let status: Status;
  if (liveRun) status = "NOW RUNNING";
  else if (isCooling) status = "COOLING";
  else status = "IDLE";

  const nextScheduled = schedule
    .filter((s) => Date.parse(s.startsAt) > now.getTime())
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0];

  // Middle content: active run context OR next-scheduled countdown.
  let middle: React.ReactNode;
  if (liveRun) {
    middle = (
      <span className="truncate font-mono text-xs text-workshop-text">
        <span className="text-workshop-muted">run:</span>{" "}
        {liveRun.label ?? liveRun.id}
        {liveRun.models.length > 0 && (
          <>
            {" "}
            <span className="text-workshop-muted">·</span>{" "}
            {liveRun.models.join(", ")}
          </>
        )}
      </span>
    );
  } else if (nextScheduled) {
    const cd = formatCountdown(Date.parse(nextScheduled.startsAt) - now.getTime());
    middle = (
      <span className="truncate font-mono text-xs text-workshop-text">
        <span className="text-workshop-muted">next:</span>{" "}
        {nextScheduled.label}
        <span className="text-workshop-muted"> · </span>
        {nextScheduled.model}
        <span className="text-workshop-muted"> · </span>
        <span className="text-workshop-primary">{cd}</span>
      </span>
    );
  } else {
    middle = (
      <span className="truncate font-mono text-xs text-workshop-muted">
        no upcoming runs scheduled
      </span>
    );
  }

  const statusClass =
    status === "NOW RUNNING"
      ? "bg-workshop-primary/20 text-workshop-primary border-workshop-primary/40"
      : status === "COOLING"
        ? "bg-workshop-danger/15 text-workshop-danger border-workshop-danger/40"
        : "bg-workshop-muted/10 text-workshop-muted border-workshop-muted/30";

  const iso = now.toISOString().replace(".000", "").replace("T", " ").replace("Z", " UTC");

  return (
    <div className="border-b border-workshop-muted/15 bg-workshop-bg/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${statusClass}`}
        >
          {status === "NOW RUNNING" && (
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-workshop-primary" />
          )}
          {status}
        </span>
        <div className="min-w-0 flex-1">{middle}</div>
        <span className="hidden font-mono text-xs text-workshop-muted tnum sm:inline">
          {iso}
        </span>
      </div>
    </div>
  );
}
