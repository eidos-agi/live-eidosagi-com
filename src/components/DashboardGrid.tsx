// DashboardGrid — 6 live tiles above the RaceBoard.
// Server component: one SQL read, six tiles rendered inline.

import Link from "next/link";
import { loadDashboardStats } from "@/lib/dashboard";

function relMin(isoOrMin: string | null | number, fromNow = false): string {
  if (typeof isoOrMin === "number") {
    if (isoOrMin < 60) return `${isoOrMin}m ago`;
    if (isoOrMin < 60 * 24) return `${Math.floor(isoOrMin / 60)}h ago`;
    return `${Math.floor(isoOrMin / (60 * 24))}d ago`;
  }
  if (!isoOrMin) return "—";
  const diff = Date.now() - Date.parse(isoOrMin);
  if (!Number.isFinite(diff)) return "—";
  const s = Math.max(0, Math.floor(diff / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
  void fromNow;
}

function fmtUsd(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "$0.000";
  if (n < 0.1) return `$${n.toFixed(3)}`;
  if (n < 1000) return `$${n.toFixed(2)}`;
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

interface TileProps {
  label: string;
  value: string;
  sub?: string;
  href?: string;
  accent?: "text" | "primary" | "command" | "danger" | "muted";
  tnum?: boolean;
}

function Tile({ label, value, sub, href, accent = "text", tnum = true }: TileProps) {
  const valueColor =
    accent === "primary"
      ? "text-workshop-primary"
      : accent === "command"
      ? "text-workshop-command"
      : accent === "danger"
      ? "text-workshop-danger"
      : accent === "muted"
      ? "text-workshop-muted"
      : "text-workshop-text";

  const inner = (
    <div className="flex h-full flex-col justify-between rounded border border-workshop-muted/20 bg-workshop-surface/50 p-4 transition-colors hover:border-workshop-primary/40 hover:bg-workshop-surface/70">
      <div className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
        {label}
      </div>
      <div
        className={`mt-2 font-heading text-2xl font-bold leading-none ${valueColor} ${
          tnum ? "tnum" : ""
        }`}
      >
        {value}
      </div>
      {sub && (
        <div className="mt-1 font-mono text-[10px] text-workshop-muted">{sub}</div>
      )}
    </div>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

export default function DashboardGrid() {
  let stats;
  try {
    stats = loadDashboardStats();
  } catch {
    return null;
  }

  const shareColor =
    stats.savings.local_share >= 0.8
      ? "command"
      : stats.savings.local_share >= 0.5
      ? "primary"
      : "muted";

  const narratorFresh =
    stats.narrator.last_event_ts &&
    Date.now() - Date.parse(stats.narrator.last_event_ts) < 5 * 60 * 1000;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-workshop-muted">
          dashboard
        </h2>
        <span className="font-mono text-[10px] text-workshop-muted">
          24h window · refreshes on tick
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
        <Tile
          label="local authorship"
          value={`${Math.round(stats.savings.local_share * 100)}%`}
          sub={`goal 90% · ${stats.savings.local_event_count} local / ${stats.savings.hosted_event_count} hosted`}
          accent={shareColor as TileProps["accent"]}
        />
        <Tile
          label="$ saved · 24h"
          value={fmtUsd(stats.savings.usd_saved)}
          sub={`vs ${fmtUsd(stats.savings.usd_incurred)} incurred hosted`}
          accent="command"
        />
        <Tile
          label="events · 24h"
          value={stats.events.total.toString()}
          sub={`${stats.events.last_hour} in last hour`}
        />
        <Tile
          label="narrator"
          value={
            narratorFresh
              ? `${stats.narrator.ticks_last_hour}/hr`
              : "stalled"
          }
          sub={`last ${relMin(stats.narrator.last_event_ts)} · ${stats.narrator.total_local_events} total`}
          accent={narratorFresh ? "primary" : "danger"}
        />
        <Tile
          label="benchmark runs"
          value={stats.runs.total.toString()}
          sub={
            stats.runs.newest_age_minutes != null
              ? `newest ${relMin(stats.runs.newest_age_minutes)}`
              : "none yet"
          }
          href="/models"
        />
        <Tile
          label="human tasks · open"
          value={stats.human_tasks.open.toString()}
          sub={`${stats.human_tasks.done} done · ${stats.human_tasks.blocked} blocked`}
          href="/human-tasks"
          accent={stats.human_tasks.open > 0 ? "primary" : "muted"}
        />
      </div>
    </div>
  );
}
