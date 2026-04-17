// Launch banner for the 2026-04-17 live event.
// Sits above SavingsStrip; persistent, dismissible only after reading.
//
// Framing (per ADR 2026-04-17):
//   Claude + Eidos AGI move themselves to 90%-cheaper silicon
//   without losing intelligence. Watch live. Open-sourced as we go.

"use client";

import { useEffect, useState } from "react";

const LINKEDIN_URL =
  "https://www.linkedin.com/feed/update/urn:li:activity:7450954697034608641/";
const DISMISS_KEY = "eidos.launch.dismissed.v1";

export default function LaunchBanner() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
    } catch {
      // ignore
    }
  }, []);

  if (dismissed) return null;

  return (
    <div
      role="region"
      aria-label="Live event notice"
      className="relative border-b border-workshop-primary/30 bg-gradient-to-r from-[var(--color-bg)] via-[var(--color-surface)] to-[var(--color-bg)]"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-2 font-mono text-[11px] leading-snug">
        <span
          className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-workshop-danger shadow-[0_0_10px_rgba(196,105,79,0.8)]"
          aria-hidden
        />
        <span className="uppercase tracking-wider text-workshop-danger">
          live event
        </span>
        <span className="hidden text-workshop-muted sm:inline">·</span>
        <span className="truncate text-workshop-text">
          Eidos is moving itself to{" "}
          <span className="text-workshop-primary">90%-cheaper silicon</span>{" "}
          without losing intelligence. Watch.
        </span>
        <a
          href={LINKEDIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto whitespace-nowrap rounded border border-workshop-primary/40 px-2 py-[3px] text-[10px] uppercase tracking-wider text-workshop-primary transition hover:bg-workshop-primary/10"
        >
          follow on LinkedIn →
        </a>
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.setItem(DISMISS_KEY, "1");
            } catch {
              // ignore
            }
            setDismissed(true);
          }}
          className="rounded-full border border-transparent p-1 text-workshop-muted transition hover:border-workshop-muted/30 hover:text-workshop-text"
          aria-label="Dismiss live event banner"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
            <path
              d="M1 1l8 8M9 1L1 9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
