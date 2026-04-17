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

const FALLBACK_REFRESH_MS = 8000; // used only if SSE can't connect
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

// Historical narrator rows contain literal markdown (llama3 likes `**bold**`).
// Strip it at render time so the sidebar looks clean even for pre-fix rows.
function cleanSummary(s: string): string {
  if (!s) return "";
  let out = s;
  out = out.replace(/\*{1,3}([^*]+?)\*{1,3}/g, "$1");
  out = out.replace(/_{1,3}([^_]+?)_{1,3}/g, "$1");
  out = out.replace(/`([^`]+)`/g, "$1");
  out = out.replace(/^\s*[\-*\u2022>#]+\s*/, "");
  return out.trim();
}

export default function ActivitySidebar() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState<boolean>(false);

  const qs = useMemo(() => `limit=${LIMIT}`, []);

  useEffect(() => {
    let cancelled = false;
    let fallbackId: ReturnType<typeof setInterval> | null = null;
    let es: EventSource | null = null;

    async function poll() {
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

    function startFallback() {
      if (fallbackId) return;
      void poll();
      fallbackId = setInterval(poll, FALLBACK_REFRESH_MS);
    }

    function stopFallback() {
      if (fallbackId) {
        clearInterval(fallbackId);
        fallbackId = null;
      }
    }

    try {
      es = new EventSource(`/api/events/stream?${qs}`);
      es.onopen = () => {
        if (cancelled) return;
        stopFallback();
        setLive(true);
        setError(null);
      };
      es.onmessage = (ev) => {
        if (cancelled) return;
        try {
          const data = JSON.parse(ev.data);
          if (data.type === "initial" && Array.isArray(data.events)) {
            setEvents(data.events as ActivityEvent[]);
          } else if (data.type === "event" && data.event) {
            const incoming = data.event as ActivityEvent;
            setEvents((prev) => {
              // Dedupe by id; prepend (list is reverse-chron newest-first).
              if (prev.some((e) => e.id === incoming.id)) return prev;
              return [incoming, ...prev].slice(0, LIMIT);
            });
          }
        } catch {
          // ignore malformed
        }
      };
      es.onerror = () => {
        if (cancelled) return;
        setLive(false);
        startFallback();
      };
    } catch {
      startFallback();
    }

    return () => {
      cancelled = true;
      stopFallback();
      if (es) es.close();
    };
  }, [qs]);

  // Expose live vs polling state to the header via a data attribute (used
  // for the 'live' / 'stale' label).
  const connectionLabel = error ? "stale" : live ? "live" : "polling";

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
            {connectionLabel}
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
      <div
        className="flex-1 overflow-y-auto"
        style={{ overscrollBehavior: "contain" }}
      >
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
                    {cleanSummary(ev.summary)}
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
