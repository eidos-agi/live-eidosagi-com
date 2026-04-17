"use client";

import { useEffect, useState } from "react";

interface Props {
  /** Server-rendered initial line to avoid the 'Silicon cooling' flash. */
  initial?: string;
}

const FALLBACK = "Silicon cooling. Next ignition soon.";

/**
 * Narrow horizontal band above the footer. One-line race narration
 * refreshed every 60s via /api/commentary.
 */
export default function Commentator({ initial }: Props = {}) {
  const [line, setLine] = useState<string>(initial || FALLBACK);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/commentary", { cache: "no-store" });
        if (!res.ok) return;
        const json: { line?: string } = await res.json();
        if (!cancelled && json.line) setLine(json.line);
      } catch {
        /* keep prior line */
      }
    }

    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Rotate the label each minute so the strip feels alive even when the
  // line itself hasn't changed yet. Era anchor: race desks, telegraphs,
  // radio booths — the voices that narrate live events.
  const LABELS = [
    "commentary",
    "race desk",
    "silicon telegraph",
    "booth",
    "play-by-play",
    "field radio",
    "ticker",
    "pit wall",
  ];
  const label = LABELS[Math.floor(Date.now() / 60_000) % LABELS.length];

  return (
    <div className="border-t border-workshop-muted/15 bg-workshop-surface/40">
      <div className="mx-auto max-w-7xl px-6 py-3">
        <p className="truncate font-mono text-xs text-workshop-muted">
          <span className="mr-2 font-bold uppercase tracking-wider text-workshop-primary">
            {label}
          </span>
          {line}
        </p>
      </div>
    </div>
  );
}
