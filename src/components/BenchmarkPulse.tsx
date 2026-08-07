"use client";

// BenchmarkPulse — a one-line live ticker that sits under the SavingsStrip.
// Shows the most recent race event ("H100 · qwen3.6:35b-a3b · 107 tok/s · 2m ago")
// and pulses on new data. First-impression signal that the site is live,
// without waiting for a visitor to notice the small activity sidebar.

import { useEffect, useRef, useState } from "react";

interface ActivityEvent {
  id: number;
  ts: string;
  actor: string;
  kind: string;
  summary: string;
}

const REFRESH_MS = 20_000;
const STALE_MS = 10 * 60 * 1000; // after 10 min, fade the pulse
const LOOKBACK = 12; // scan last 12 events for an actor='benchmark' hit

function relTime(iso: string): string {
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

// Most recent activity-feed row authored by the race runner ("benchmark" actor).
async function fetchLatestBenchmark(): Promise<ActivityEvent | null> {
  try {
    const res = await fetch(`/api/events?limit=${LOOKBACK}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { events?: ActivityEvent[] };
    const bm = (data.events ?? []).find((e) => e.actor === "benchmark");
    return bm ?? null;
  } catch {
    return null;
  }
}

// Extract GPU label from "race · qwen3.6:35b-a3b · H100 409 tok/s [A100 44]".
function parseSummary(s: string): {
  model: string | null;
  gpu: string | null;
  tokps: number | null;
} {
  const model = s.match(/·\s+([a-z0-9.:\-]+)\s+·/i)?.[1] ?? null;
  const m = s.match(/(H100|A100|A6000)\s+([\d.]+)\s+tok\/s/i);
  const gpu = m?.[1] ?? null;
  const tokps = m ? Number(m[2]) : null;
  return { model, gpu, tokps };
}

function gpuTone(gpu: string | null): string {
  switch (gpu) {
    case "H100":
      return "text-workshop-secondary"; // sage
    case "A100":
      return "text-workshop-primary"; // amber
    case "A6000":
      return "text-workshop-command"; // muted green
    default:
      return "text-workshop-text";
  }
}

interface Props {
  /** SSR-seeded latest benchmark event — kills the "waiting for signal"
   * flash on first paint. Client still refreshes from /api/events. */
  initial?: ActivityEvent | null;
}

export default function BenchmarkPulse({ initial = null }: Props = {}) {
  const [ev, setEv] = useState<ActivityEvent | null>(initial);
  const [flash, setFlash] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  // Seed lastIdRef with the initial event's id so the first client fetch
  // that returns the same event doesn't spurious-flash.
  const lastIdRef = useRef<number | null>(initial?.id ?? null);

  // Fetch + set-up pulse on new id
  useEffect(() => {
    let cancelled = false;
    async function tick() {
      const next = await fetchLatestBenchmark();
      if (cancelled || !next) return;
      if (lastIdRef.current !== null && next.id !== lastIdRef.current) {
        const reduced =
          typeof window !== "undefined" &&
          window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        if (!reduced) {
          setFlash(true);
          setTimeout(() => setFlash(false), 620);
        }
      }
      lastIdRef.current = next.id;
      setEv(next);
    }
    void tick();
    const id = setInterval(tick, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Re-render once a second so relative time stays fresh — cheap, no fetch.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!ev) {
    return (
      <div
        className="border-b border-workshop-primary/10 bg-[var(--color-bg)]/80"
        aria-hidden
      >
        <div className="mx-auto flex h-[24px] max-w-7xl items-center gap-2 px-6 font-mono text-[11px] uppercase tracking-wider text-workshop-muted">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-workshop-muted/40" />
          <span>benchmark · waiting for signal</span>
        </div>
      </div>
    );
  }

  const { model, gpu, tokps } = parseSummary(ev.summary);
  const ageMs = now - Date.parse(ev.ts);
  const stale = ageMs > STALE_MS;
  const tone = gpuTone(gpu);

  return (
    <div
      className="border-b border-workshop-primary/10 bg-[var(--color-bg)]/80"
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex h-[24px] max-w-7xl items-center gap-3 px-6 font-mono text-[11px] uppercase tracking-wider">
        <span
          aria-hidden
          className={`inline-block h-1.5 w-1.5 rounded-full shadow-[0_0_6px_currentColor] ${
            stale ? "bg-workshop-muted/50 text-workshop-muted/50" : `bg-current ${tone}`
          } ${flash ? "[animation:bench-flash_0.6s_ease-out]" : !stale ? "animate-pulse" : ""}`}
        />
        <span className="text-workshop-muted">last race</span>
        {gpu && <span className={`${tone} font-semibold`}>{gpu}</span>}
        {model && (
          <>
            <span className="text-workshop-muted">·</span>
            <span className="text-workshop-text">{model}</span>
          </>
        )}
        {tokps !== null && (
          <>
            <span className="text-workshop-muted">·</span>
            <span className="tnum text-workshop-command">{tokps} tok/s</span>
          </>
        )}
        <span className="ml-auto tnum text-workshop-muted">{relTime(ev.ts)}</span>
      </div>
      {/* flash keyframe — brief bloom on new event */}
      <style jsx>{`
        @keyframes bench-flash {
          0%   { transform: scale(1);   filter: drop-shadow(0 0 0 currentColor);  opacity: 0.4; }
          40%  { transform: scale(2.2); filter: drop-shadow(0 0 14px currentColor); opacity: 1; }
          100% { transform: scale(1);   filter: drop-shadow(0 0 6px currentColor);  opacity: 1; }
        }
      `}</style>
    </div>
  );
}
