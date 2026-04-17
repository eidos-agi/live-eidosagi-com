"use client";

import { useEffect, useState } from "react";
import type { ProgressEvent } from "@/lib/types";

interface StreamState {
  events: ProgressEvent[];
  connected: boolean;
}

/**
 * Subscribes to the SSE stream at /api/runs/[id]/stream and seeds state with
 * /api/runs/[id]/events. Returns all events seen so far for the run.
 */
export function useRunStream(runId: string | null): StreamState {
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!runId) {
      setEvents([]);
      setConnected(false);
      return;
    }
    let cancelled = false;

    // Seed from the snapshot endpoint first so reloads don't start blank.
    fetch(`/api/runs/${encodeURIComponent(runId)}/events`)
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((data) => {
        if (cancelled) return;
        setEvents(data.events ?? []);
      })
      .catch(() => {
        /* empty state handled by UI */
      });

    const es = new EventSource(
      `/api/runs/${encodeURIComponent(runId)}/stream`,
    );
    es.addEventListener("ready", () => setConnected(true));
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (msg) => {
      try {
        const parsed = JSON.parse(msg.data) as ProgressEvent;
        if (!parsed || typeof parsed.tokenPerSec !== "number") return;
        setEvents((prev) => {
          const next = prev.concat(parsed);
          // Cap to keep memory bounded on very long runs.
          return next.length > 10_000 ? next.slice(-10_000) : next;
        });
      } catch {
        /* ignore */
      }
    };
    return () => {
      cancelled = true;
      es.close();
    };
  }, [runId]);

  return { events, connected };
}
