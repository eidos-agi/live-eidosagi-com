// GET /api/models — aggregated leaderboard rows (model × gpu).
// Always returns an array; empty when no data.

import { NextResponse } from "next/server";
import { buildLeaderboard } from "@/lib/leaderboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await buildLeaderboard();
    // Benchmarks land every ~90 s; 60 s CDN cache is a wash on freshness
    // but halves origin cost for repeat visitors on /models.
    return NextResponse.json(
      { rows, count: rows.length },
      {
        headers: {
          "cache-control": "public, s-maxage=60, stale-while-revalidate=120",
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
