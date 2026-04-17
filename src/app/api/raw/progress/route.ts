// GET /api/raw/progress?format=json|csv — raw progress events dump.

import { NextResponse, type NextRequest } from "next/server";
import { loadAllRawData } from "@/lib/leaderboard";
import { rawToCsv, pickFormat } from "../_csv";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const format = pickFormat(req);
  try {
    const { progress } = await loadAllRawData();
    if (format === "csv") {
      return new NextResponse(rawToCsv(progress), {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "cache-control": "no-store",
          "content-disposition": 'attachment; filename="progress.csv"',
        },
      });
    }
    return NextResponse.json(progress, {
      headers: { "cache-control": "no-store" },
    });
  } catch {
    if (format === "csv") {
      return new NextResponse("", {
        headers: { "content-type": "text/csv; charset=utf-8" },
      });
    }
    return NextResponse.json([]);
  }
}
