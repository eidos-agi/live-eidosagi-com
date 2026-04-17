"use client";

// Always-open activity sidebar on desktop (immediately left of ChatSidebar).
// Dense Bloomberg-ish data rail: reverse-chron event log, tight mono type,
// no card chrome, refreshes every 3s via /api/events. On mobile, hidden —
// a full /activity page exists for that.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ActivityIcon from "./ActivityIcon";

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
const INITIAL_LIMIT = 80;
const PAGE_SIZE = 60;
const BUFFER_CAP = 1000; // in-memory ceiling; progressive reveal by scroll

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

// Text + border color for the icon chip — mirrors actorDot.
function actorTone(actor: string): {
  text: string;
  border: string;
  bg: string;
} {
  switch (actor) {
    case "eidos":
    case "claude":
      return {
        text: "text-workshop-primary",
        border: "border-workshop-primary/40",
        bg: "bg-transparent",
      };
    case "human":
      return {
        text: "text-workshop-secondary",
        border: "border-workshop-secondary/40",
        bg: "bg-transparent",
      };
    case "github":
      return {
        text: "text-workshop-command",
        border: "border-workshop-command/50",
        bg: "bg-transparent",
      };
    case "benchmark":
      return {
        text: "text-workshop-danger",
        border: "border-workshop-danger/40",
        bg: "bg-transparent",
      };
    case "local-llm":
    case "eidos-local":
    case "qwen-coder":
      return {
        text: "text-workshop-command",
        border: "border-workshop-command/40",
        bg: "bg-transparent",
      };
    default:
      return {
        text: "text-workshop-muted",
        border: "border-workshop-muted/30",
        bg: "bg-transparent",
      };
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const qs = useMemo(() => `limit=${INITIAL_LIMIT}`, []);

  // Load older events (progressive reveal — triggered when user scrolls
  // near the bottom of the feed).
  const loadOlder = useCallback(async () => {
    if (loadingMore || !hasMore || events.length === 0) return;
    const oldestTs = events[events.length - 1]?.ts;
    if (!oldestTs) return;
    setLoadingMore(true);
    try {
      const before = Date.parse(oldestTs);
      const res = await fetch(
        `/api/events?limit=${PAGE_SIZE}&before=${before}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`${res.status}`);
      const data = (await res.json()) as { events: ActivityEvent[] };
      const older = data.events ?? [];
      if (older.length === 0) {
        setHasMore(false);
      } else {
        setEvents((prev) => {
          const seen = new Set(prev.map((e) => e.id));
          const appended = older.filter((e) => !seen.has(e.id));
          if (appended.length === 0) {
            setHasMore(false);
            return prev;
          }
          return [...prev, ...appended].slice(0, BUFFER_CAP);
        });
      }
    } catch {
      // ignore — user can try again next scroll
    } finally {
      setLoadingMore(false);
    }
  }, [events, hasMore, loadingMore]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // trigger when within 200px of the bottom
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
      void loadOlder();
    }
  }, [loadOlder]);

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
              return [incoming, ...prev].slice(0, BUFFER_CAP);
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
            className={`inline-block h-2 w-2 rounded-full bg-workshop-primary shadow-[0_0_8px_rgba(196,147,90,0.6)] ${
              live ? "animate-pulse" : ""
            }`}
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

      {/* Events — tight list, progressive-reveal on scroll */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
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
            {events.map((ev) => {
              const tone = actorTone(ev.actor);
              return (
                <li
                  key={ev.id}
                  className="group flex items-start gap-2.5 px-3 py-2 transition-colors hover:bg-workshop-primary/5"
                >
                  <span
                    className={`mt-[2px] inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border ${tone.border} ${tone.bg} ${tone.text}`}
                    aria-hidden
                    title={`${actorLabel(ev.actor)} · ${ev.kind}`}
                  >
                    <ActivityIcon name={ev.icon} kind={ev.kind} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
                      <span className="tnum text-workshop-text">
                        {relativeTime(ev.ts)}
                      </span>
                      <span>{actorLabel(ev.actor)}</span>
                    </div>
                    <div className="mt-0.5 break-words text-[12px] leading-snug text-workshop-text">
                      {cleanSummary(ev.summary)}
                    </div>
                  </div>
                </li>
              );
            })}
            {/* Progressive-reveal footer */}
            {events.length > 0 && (
              <li className="px-3 py-4 text-center font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
                {loadingMore
                  ? "loading older…"
                  : hasMore
                  ? "scroll for more"
                  : `end of log · ${events.length} events`}
              </li>
            )}
          </ul>
        )}
      </div>
    </aside>
  );
}
