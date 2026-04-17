"use client";

// Force a soft refresh of server-rendered content (RaceBoard, SavingsStrip,
// run metadata, /models snapshots) on a cadence. Uses Next.js App Router's
// router.refresh() — re-runs server components without a full page reload,
// so SSE connections stay alive and scroll positions survive.
//
// Behavior:
//   - Tick every NEXT_PUBLIC_AUTO_REFRESH_MS (default 120000 = 2 min)
//   - Skip the tick if the tab is backgrounded (document.hidden)
//   - Also fire immediately when a run_start event lands on the SSE stream
//
// Mounted once in layout.tsx; no props.

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_REFRESH_MS = 120_000;

export default function AutoRefresh() {
  const router = useRouter();
  const lastRef = useRef<number>(Date.now());

  useEffect(() => {
    const raw = process.env.NEXT_PUBLIC_AUTO_REFRESH_MS;
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    const refreshMs =
      Number.isFinite(parsed) && parsed >= 30_000 ? parsed : DEFAULT_REFRESH_MS;

    function tick() {
      if (typeof document !== "undefined" && document.hidden) return;
      const now = Date.now();
      if (now - lastRef.current < 5_000) return; // dedupe if run_start just fired
      lastRef.current = now;
      router.refresh();
    }

    const id = setInterval(tick, refreshMs);

    // Listen for run_start events on the SSE stream and refresh immediately
    // when one arrives — so a freshly-ignited run surfaces its new lanes
    // without waiting for the 2-min heartbeat.
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/events/stream?limit=1");
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data.type === "event" && data.event?.kind === "milestone") {
            const summary = String(data.event.summary ?? "").toLowerCase();
            if (summary.includes("run") && summary.includes("ignited")) {
              tick();
            }
          }
        } catch {
          // ignore
        }
      };
    } catch {
      // ES unsupported; polling-only is fine
    }

    return () => {
      clearInterval(id);
      if (es) es.close();
    };
  }, [router]);

  return null;
}
