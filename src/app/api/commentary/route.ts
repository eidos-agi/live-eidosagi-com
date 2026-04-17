import { NextResponse } from "next/server";
import { narrate } from "@/lib/commentary";
import { listRuns, readEvents } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns a one-line commentary based on the most recent run's last
 * minute of progress events.
 */
export async function GET(): Promise<NextResponse> {
  const runs = await listRuns();
  const run = runs.find((r) => r.endedAt == null) ?? runs[0] ?? null;
  if (!run) {
    return NextResponse.json({
      line: "Silicon cooling. Next ignition soon.",
      runId: null,
    });
  }
  const events = await readEvents(run.id);
  const line = narrate(run, events);
  return NextResponse.json({ line, runId: run.id });
}
