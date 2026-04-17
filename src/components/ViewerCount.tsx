"use client";

import { useEffect, useState } from "react";

/**
 * Small "N watching" chip. Pings /api/presence/ping every 20s with a
 * stable per-tab clientId. Count resets on deploy — that's fine.
 */
export default function ViewerCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    // Stable per-tab id. Persists across refreshes via sessionStorage.
    let clientId = sessionStorage.getItem("eidosPresenceId");
    if (!clientId) {
      clientId = `c_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
      sessionStorage.setItem("eidosPresenceId", clientId);
    }

    let cancelled = false;

    async function ping() {
      try {
        const res = await fetch("/api/presence/ping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId }),
        });
        if (cancelled || !res.ok) return;
        const json: { watching?: number } = await res.json();
        setCount(typeof json.watching === "number" ? json.watching : null);
      } catch {
        /* swallow */
      }
    }

    ping();
    const id = setInterval(ping, 20_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (count == null) return null;

  return (
    <span
      className="inline-flex items-center gap-1.5 font-mono text-xs text-workshop-muted"
      title="Approximate count of active viewers in the last 60 seconds"
    >
      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-workshop-command" />
      <span className="tnum text-workshop-text">{count}</span>
      watching
    </span>
  );
}
