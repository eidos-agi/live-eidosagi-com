"use client";

import { useEffect, useState } from "react";

/**
 * Narrow horizontal band above the footer. One-line race narration
 * refreshed every 60s via /api/commentary.
 */
export default function Commentator() {
  const [line, setLine] = useState<string>("Silicon cooling. Next ignition soon.");

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

  return (
    <div className="border-t border-workshop-muted/15 bg-workshop-surface/40">
      <div className="mx-auto max-w-7xl px-6 py-3">
        <p className="truncate font-mono text-xs text-workshop-muted">
          <span className="mr-2 font-bold uppercase tracking-wider text-workshop-primary">
            commentary
          </span>
          {line}
        </p>
      </div>
    </div>
  );
}
