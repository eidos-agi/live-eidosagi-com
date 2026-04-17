// GET /api/models — aggregated leaderboard rows (model × gpu).
// Always returns an array; empty when no data.

import { NextResponse } from "next/server";
import { buildLeaderboard } from "@/lib/leaderboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await buildLeaderboard();
    return NextResponse.json(
      { rows, count: rows.length },
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      "[api/models] buildLeaderboard failed:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { rows: [], count: 0, error: "failed" },
      { status: 200 },
    );
  }
}
