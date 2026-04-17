// In-memory presence tracker.
//
// Each page POSTs to /api/presence/ping every 20s. The server tracks
// client-id -> last-seen timestamp. Count = "seen within last 60s".
//
// This is process-local and resets on deploy. That's fine — it's for
// a "N watching" chip, not auth.

interface PresenceHolder {
  __eidosLivePresence?: Map<string, number>;
}

function store(): Map<string, number> {
  const holder = globalThis as unknown as PresenceHolder;
  if (!holder.__eidosLivePresence) {
    holder.__eidosLivePresence = new Map();
  }
  return holder.__eidosLivePresence;
}

/** Record/refresh a client's last-seen time. Returns current count. */
export function touch(clientId: string): number {
  const s = store();
  s.set(clientId, Date.now());
  prune(s);
  return s.size;
}

/** Active count — clients seen within the last 60s. */
export function count(): number {
  const s = store();
  prune(s);
  return s.size;
}

function prune(s: Map<string, number>): void {
  const cutoff = Date.now() - 60_000;
  for (const [id, ts] of s) {
    if (ts < cutoff) s.delete(id);
  }
}
