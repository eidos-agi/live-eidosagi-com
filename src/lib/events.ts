// SQLite-backed event feed for the Activity Stream.
//
// Thin wrapper around `@/lib/db`. Preserves the public shape of the previous
// pg-backed module so the Activity Feed UI doesn't need to change.

import {
  listEvents as listEventsDb,
  type ActivityEvent as DbActivityEvent,
  type ListEventsOpts,
} from "./db";

export type ActivityEvent = DbActivityEvent;

/** Kept async so existing server components (`await listEvents(...)`) keep working. */
export async function listEvents(
  opts: ListEventsOpts = {},
): Promise<ActivityEvent[]> {
  return listEventsDb(opts);
}
