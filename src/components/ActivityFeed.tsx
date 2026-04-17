"use client";

import { useEffect, useMemo, useState } from "react";

export interface ActivityEvent {
  id: number;
  ts: string;
  sessionId: string;
  actor: string;
  kind: string;
  summary: string;
  details: Record<string, unknown>;
  icon: string | null;
  relatedRun: string | null;
}

interface Props {
  initialEvents?: ActivityEvent[];
  sessionId?: string | null;
  limit?: number;
  /** Poll interval in ms. 0 = no polling (static SSR). */
  refreshMs?: number;
  /** Compact mode is used for the home-page strip. */
  compact?: boolean;
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

function iconGlyph(icon: string | null, kind: string): string {
  if (icon) {
    const map: Record<string, string> = {
      rocket: "↗",
      flame: "◆",
      check: "✓",
      search: "?",
      warn: "!",
      gear: "⚙",
      write: "▲",
      read: "▽",
    };
    if (map[icon]) return map[icon];
  }
  const kindMap: Record<string, string> = {
    action: "▶",
    decision: "◆",
    observation: "·",
    milestone: "✓",
  };
  return kindMap[kind] ?? "·";
}

function actorTone(actor: string): string {
  switch (actor) {
    case "claude":
      return "text-workshop-primary border-workshop-primary/40";
    case "human":
      return "text-workshop-secondary border-workshop-secondary/40";
    case "system":
      return "text-workshop-muted border-workshop-muted/40";
    default:
      return "text-workshop-command border-workshop-command/40";
  }
}

export default function ActivityFeed({
  initialEvents = [],
  sessionId = null,
  limit = 50,
  refreshMs = 0,
  compact = false,
}: Props) {
  const [events, setEvents] = useState<ActivityEvent[]>(initialEvents);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("limit", String(limit));
    if (sessionId) p.set("session", sessionId);
    return p.toString();
  }, [limit, sessionId]);

  useEffect(() => {
    if (refreshMs <= 0) return;
    let cancelled = false;

    async function tick() {
      try {
        const res = await fetch(`/api/events?${qs}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`${res.status}`);
        const data = (await res.json()) as { events: ActivityEvent[] };
        if (!cancelled) {
          setEvents(data.events ?? []);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "fetch failed");
        }
      }
    }

    // First tick immediately so the strip fills in client-side even if SSR
    // returned empty (e.g. DATABASE_URL was only available at runtime).
    void tick();
    const id = setInterval(tick, refreshMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [qs, refreshMs]);

  if (events.length === 0) {
    return (
      <div
        className={`rounded border border-dashed border-workshop-muted/30 bg-workshop-surface/50 p-6 text-center text-sm text-workshop-muted ${
          compact ? "p-3 text-xs" : ""
        }`}
      >
        {error
          ? `activity unavailable (${error})`
          : "no activity yet — waiting for events"}
      </div>
    );
  }

  return (
    <ul
      className={`divide-y divide-workshop-muted/15 overflow-hidden rounded border border-workshop-muted/20 bg-workshop-surface/40 ${
        compact ? "text-xs" : "text-sm"
      }`}
    >
      {events.map((ev) => {
        const isOpen = expanded[ev.id] === true;
        const hasDetails =
          ev.details && Object.keys(ev.details).length > 0;
        return (
          <li key={ev.id} className="px-3 py-2">
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border font-mono text-[10px] ${actorTone(
                  ev.actor,
                )}`}
                title={`${ev.actor} · ${ev.kind}`}
              >
                {iconGlyph(ev.icon, ev.kind)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 text-workshop-text">
                  <span className="truncate">{ev.summary}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
                  <span className="tnum">{relativeTime(ev.ts)}</span>
                  <span>·</span>
                  <span>{ev.actor}</span>
                  {!compact && (
                    <>
                      <span>·</span>
                      <span className="truncate">{ev.sessionId}</span>
                    </>
                  )}
                  {hasDetails && !compact && (
                    <>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded((prev) => ({
                            ...prev,
                            [ev.id]: !isOpen,
                          }))
                        }
                        className="text-workshop-primary hover:underline"
                      >
                        {isOpen ? "hide" : "details"}
                      </button>
                    </>
                  )}
                </div>
                {isOpen && hasDetails && (
                  <pre className="mt-2 overflow-x-auto rounded border border-workshop-muted/15 bg-workshop-bg/60 p-2 font-mono text-[11px] text-workshop-command">
                    {JSON.stringify(ev.details, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
