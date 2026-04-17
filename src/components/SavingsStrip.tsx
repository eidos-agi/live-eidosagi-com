"use client";

// SavingsStrip — single-line visible self-cheapening telemetry.
//
// Sits between the nav header and <main>, full content width, 28–32px
// tall. Polls /api/savings every 15s. Renders e.g.:
//
//   ◆ LOCAL AI WROTE 72% OF TODAY'S EVENTS · $4.18 SAVED
//
// Color rules (percentage):
//   share <  50%  ->  muted
//   50% <= share < 80%  ->  amber brass (--color-primary)
//   share >= 80%  ->  sage command green (--color-command)
//
// The diamond glyph gets a brief glow pulse whenever the number
// changes, unless the user prefers reduced motion.
//
// Refs: TASK-0010, TASK-0012, visionlog GOAL-001, ADR-003.

import { useEffect, useRef, useState } from "react";

const REFRESH_MS = 15_000;

interface SavingsPayload {
  window_hours: number;
  total_events: number;
  by_actor: Record<string, number>;
  local_event_count: number;
  hosted_event_count: number;
  local_share: number;
  usd_saved_estimate: number;
  claude_event_cost_usd: number;
  updated_at: string;
}

function formatUsd(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "$0.000";
  // Under a dime: 3 decimals so the counter breathes from the first local event.
  if (n < 0.10) return `$${n.toFixed(3)}`;
  if (n < 1000) return `$${n.toFixed(2)}`;
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function shareColorClass(share: number): string {
  if (share >= 0.8) return "text-workshop-command";
  if (share >= 0.5) return "text-workshop-primary";
  return "text-workshop-muted";
}

export default function SavingsStrip() {
  const [data, setData] = useState<SavingsPayload | null>(null);
  const [pulse, setPulse] = useState(false);
  const lastSigRef = useRef<string>("");

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const res = await fetch("/api/savings", { cache: "no-store" });
        if (!res.ok) throw new Error(`${res.status}`);
        const next = (await res.json()) as SavingsPayload;
        if (cancelled) return;
        const sig = `${next.local_event_count}|${next.hosted_event_count}|${next.usd_saved_estimate}`;
        if (lastSigRef.current && lastSigRef.current !== sig) {
          const reduced =
            typeof window !== "undefined" &&
            window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
          if (!reduced) {
            setPulse(true);
            setTimeout(() => setPulse(false), 260);
          }
        }
        lastSigRef.current = sig;
        setData(next);
      } catch {
        // Swallow — the strip stays on the last good value. If we
        // never got one, the idle "waiting" state keeps showing.
      }
    }

    void tick();
    const id = setInterval(tick, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const pct =
    data && data.total_events > 0
      ? Math.round(data.local_share * 100)
      : 0;
  const saved = data?.usd_saved_estimate ?? 0;
  const empty = !data || data.total_events === 0;

  return (
    <div
      className="border-b border-workshop-primary/15 bg-[var(--color-surface)]/70 backdrop-blur"
      role="status"
      aria-live="polite"
      aria-label="Local AI authorship and estimated savings over the last 24 hours"
    >
      <div className="mx-auto flex h-[30px] max-w-7xl items-center gap-2 px-6 font-mono text-[11px] uppercase tracking-wider">
        <span
          aria-hidden
          className={`inline-block text-workshop-primary transition-[filter,opacity] duration-200 ${
            pulse
              ? "opacity-100 [filter:drop-shadow(0_0_6px_rgba(196,147,90,0.85))]"
              : "opacity-80"
          }`}
          style={{ fontSize: "12px", lineHeight: 1 }}
        >
          ◆
        </span>
        {empty ? (
          <span className="text-workshop-muted">waiting for first event</span>
        ) : (
          <>
            <span className="text-workshop-muted">local ai wrote</span>
            <span className={`tnum font-semibold ${shareColorClass(data!.local_share)}`}>
              {pct}%
            </span>
            <span className="text-workshop-muted">
              of today&apos;s events
            </span>
            <span className="text-workshop-muted/60" aria-hidden>
              ·
            </span>
            <span className="tnum text-workshop-command">
              {formatUsd(saved)}
            </span>
            <span className="text-workshop-muted">saved</span>
          </>
        )}
        <a
          href="/methodology#savings"
          className="ml-auto text-workshop-muted/70 transition hover:text-workshop-primary"
        >
          how?
        </a>
      </div>
    </div>
  );
}
