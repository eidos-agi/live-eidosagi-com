"use client";

// Always-open activity sidebar on desktop (immediately left of ChatSidebar).
// Dense Bloomberg-ish data rail: reverse-chron event log, tight mono type,
// no card chrome, refreshes every 3s via /api/events. On mobile, hidden —
// a full /activity page exists for that.

import { useEffect, useMemo, useState } from "react";

interface ActivityEvent {
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

const REFRESH_MS = 3000;
const LIMIT = 80;

function relativeTime(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  if (!Number.isFinite(diff)) return "—";
  const s = Math.max(0, Math.floor(diff / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
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
      "git-branch": "⑂",
      "git-pull-request": "⇅",
      "git-commit": "●",
    };
    if (map[icon]) return map[icon];
  }
  const kindMap: Record<string, string> = {
    action: "▶",
    decision: "◆",
    observation: "·",
    milestone: "✓",
    commit: "●",
    pr: "⇅",
  };
  return kindMap[kind] ?? "·";
}

function actorDot(actor: string): string {
  switch (actor) {
    case "eidos":
    case "claude": // historical — pre-rename events
      return "bg-workshop-primary";
    case "human":
      return "bg-workshop-secondary";
    case "system":
      return "bg-workshop-muted";
    case "github":
      return "bg-workshop-command";
    case "benchmark":
      return "bg-workshop-danger";
    case "local-llm":
    case "eidos-local":
    case "qwen-coder":
      return "bg-workshop-command";
    default:
      return "bg-workshop-muted";
  }
}

// Map the DB actor to a display label. Historical 'claude' rows are
// labeled 'eidos' publicly — the narrative agent is always Eidos.
function actorLabel(actor: string): string {
  if (actor === "claude") return "eidos";
  return actor;
}

export default function ActivitySidebar() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const qs = useMemo(() => `limit=${LIMIT}`, []);

  useEffect(() => {
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
        if (!cancelled) setError(e instanceof Error ? e.message : "fetch_err");
      }
    }
    void tick();
    const id = setInterval(tick, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [qs]);

  return (
    <aside
      className="fixed right-[320px] top-0 bottom-0 z-20 hidden w-[320px] flex-col border-l border-workshop-primary/15 bg-[var(--color-surface)]/95 backdrop-blur lg:flex"
      aria-label="Agent activity feed"
    >
      {/* Header — Bloomberg-tight */}
      <div className="flex items-center justify-between border-b border-workshop-primary/15 bg-gradient-to-b from-[var(--color-surface)] to-[var(--color-surface)]/80 px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full bg-workshop-primary shadow-[0_0_8px_rgba(196,147,90,0.6)]"
            aria-hidden
          />
          <span className="font-heading text-sm font-semibold text-workshop-text">
            activity
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
            {error ? "stale" : "live"}
          </span>
        </div>
        <a
          href="/api/events?limit=200"
          className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted transition hover:text-workshop-primary"
          target="_blank"
          rel="noopener"
        >
          raw json →
        </a>
      </div>

      {/* Events — tight list, no card chrome */}
      <div className="flex-1 overflow-y-auto">
        {events.length === 0 ? (
          <div className="px-4 py-10 font-mono text-[11px] leading-relaxed text-workshop-muted">
            <p className="mb-2 text-workshop-text">
              waiting for signal.
            </p>
            <p>
              commits, deploys, benchmark scores, agent actions — they&apos;ll
              stream in here as they happen.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-workshop-muted/10">
            {events.map((ev) => (
              <li
                key={ev.id}
                className="group flex items-start gap-2 px-3 py-2 transition-colors hover:bg-workshop-primary/5"
              >
                <span
                  className={`mt-[7px] inline-block h-1.5 w-1.5 shrink-0 rounded-full ${actorDot(ev.actor)}`}
                  aria-hidden
                  title={actorLabel(ev.actor)}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
                    <span className="tnum text-workshop-text">
                      {relativeTime(ev.ts)}
                    </span>
                    <span>{actorLabel(ev.actor)}</span>
                    <span className="ml-auto">
                      {iconGlyph(ev.icon, ev.kind)}
                    </span>
                  </div>
                  <div className="mt-0.5 break-words text-[12px] leading-snug text-workshop-text">
                    {ev.summary}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
