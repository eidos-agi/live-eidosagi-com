"use client";

// SavingsStrip — live mission progress bar toward 90% local narration.
//
// Renders a single thin horizontal progress bar spanning the full content
// width. Fill = current local_share. A dashed goal-line at 90% shows the
// mission target. Color transitions as share crosses 50% and 80%.
//
// Numbers overlaid on the bar (tabular-nums) so the text doesn't jitter
// while the fill animates.
//
// Polls /api/savings every 15s; pulses the goal-line glyph on any change.
//
// Refs: TASK-0010, TASK-0012, visionlog GOAL-001, ADR-003.

import { useEffect, useRef, useState } from "react";

const REFRESH_MS = 15_000;
const GOAL_PCT = 90; // mission: 90% local narration

interface SavingsPayload {
  window_hours: number;
  total_events: number;
  by_actor: Record<string, number>;
  local_event_count: number;
  hosted_event_count: number;
  local_share: number;
  usd_saved_estimate: number;
  hosted_cost_incurred_usd?: number;
  claude_event_cost_usd: number;
  updated_at: string;
}

function formatUsd(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "$0.000";
  if (n < 0.10) return `$${n.toFixed(3)}`;
  if (n < 1000) return `$${n.toFixed(2)}`;
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Color bands keyed to the share. Tailwind arbitrary vars so we can feed
// the workshop palette directly.
function fillColor(share: number): string {
  if (share >= 0.90) return "bg-workshop-command";          // sage: mission complete
  if (share >= 0.80) return "bg-workshop-command/80";
  if (share >= 0.50) return "bg-workshop-primary";          // amber brass: past halfway
  if (share > 0) return "bg-workshop-primary/60";
  return "bg-workshop-muted/30";
}

function textEmphasis(share: number): string {
  if (share >= 0.80) return "text-workshop-command";
  if (share >= 0.50) return "text-workshop-primary";
  return "text-workshop-text";
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
            setTimeout(() => setPulse(false), 380);
          }
        }
        lastSigRef.current = sig;
        setData(next);
      } catch {
        // swallow — last good value stays on screen
      }
    }

    void tick();
    const id = setInterval(tick, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const share = data?.local_share ?? 0;
  const pct = Math.round(share * 100);
  const saved = data?.usd_saved_estimate ?? 0;
  const incurred = data?.hosted_cost_incurred_usd ?? 0;
  const local = data?.local_event_count ?? 0;
  const hosted = data?.hosted_event_count ?? 0;
  const empty = !data || data.total_events === 0;

  // Fill width — animate via CSS transition on style.width.
  const fillWidth = `${Math.min(100, pct)}%`;

  return (
    <div
      className="relative border-b border-workshop-primary/15 bg-[var(--color-surface)]/80 backdrop-blur"
      role="status"
      aria-live="polite"
      aria-label={
        empty
          ? "Mission progress: waiting for first event"
          : `Mission progress: local AI wrote ${pct}% of today's events, saving ${formatUsd(saved)}`
      }
    >
      {/* The bar itself */}
      <div className="relative h-[36px] overflow-hidden">
        {/* Base track */}
        <div className="absolute inset-0 bg-[var(--color-bg)]/40" />

        {/* Filled portion */}
        <div
          className={`absolute inset-y-0 left-0 transition-[width,background-color] duration-700 ease-out ${fillColor(share)}`}
          style={{ width: fillWidth }}
        />

        {/* Goal tick at 90% */}
        <div
          className="pointer-events-none absolute inset-y-0 flex flex-col items-center"
          style={{ left: `${GOAL_PCT}%` }}
          aria-hidden
        >
          <div
            className={`h-full w-px border-l border-dashed transition-colors ${
              share >= GOAL_PCT / 100
                ? "border-workshop-command/90"
                : "border-workshop-primary/50"
            }`}
          />
        </div>

        {/* Overlaid content (two rows: headline + fine print) */}
        <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center gap-3 px-6 font-mono text-[11px] uppercase tracking-wider">
          <span
            aria-hidden
            className={`inline-block transition-[filter,opacity] duration-300 ${
              pulse
                ? "opacity-100 [filter:drop-shadow(0_0_10px_rgba(196,147,90,0.95))]"
                : "opacity-80"
            }`}
            style={{ fontSize: "13px", lineHeight: 1 }}
          >
            ◆
          </span>

          {empty ? (
            <span className="text-workshop-muted">
              mission: 90% local authorship — waiting for first event
            </span>
          ) : (
            <>
              <span className="text-workshop-muted">local authorship</span>
              <span
                className={`tnum font-semibold ${textEmphasis(share)}`}
                style={{ fontSize: "13px" }}
              >
                {pct}%
              </span>
              <span className="hidden text-workshop-muted sm:inline">
                · goal 90%
              </span>
              <span className="text-workshop-muted" aria-hidden>
                ·
              </span>
              <span className="tnum text-workshop-command">
                {formatUsd(saved)}
              </span>
              <span className="text-workshop-muted">saved</span>
              <span className="hidden text-workshop-muted sm:inline" aria-hidden>
                ·
              </span>
              <span className="hidden tnum text-workshop-muted sm:inline">
                {local} local / {hosted} hosted
              </span>
            </>
          )}

          <a
            href="/methodology#savings"
            className="ml-auto text-workshop-muted transition hover:text-workshop-primary"
          >
            how?
          </a>
        </div>
      </div>

      {/* SR-only summary for screen readers beyond the aria-label */}
      {!empty && (
        <span className="sr-only">
          Mission: local silicon authors 90 percent of event narration.
          Currently {pct} percent. Hosted cost incurred {formatUsd(incurred)}.
          Savings {formatUsd(saved)}.
        </span>
      )}
    </div>
  );
}
