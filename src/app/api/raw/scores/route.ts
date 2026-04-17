// GET /api/raw/scores?format=json|csv — raw eval scores dump.

import { NextResponse, type NextRequest } from "next/server";
import { loadAllRawData } from "@/lib/leaderboard";
import { rawToCsv, pickFormat } from "../_csv";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const format = pickFormat(req);
  try {
    const { scores } = await loadAllRawData();
    // flatten dimensions so CSV is usable
    const flat = scores.map((s) => ({
      runId: s.runId,
      model: s.model,
      useCase: s.useCase,
      testCaseId: s.testCaseId,
      composite: s.composite,
      correctness: s.dimensions?.correctness,
      completeness: s.dimensions?.completeness,
      formatQuality: s.dimensions?.formatQuality,
      conciseness: s.dimensions?.conciseness,
      tokPerSec: s.tokPerSec,
    }));
    if (format === "csv") {
      return new NextResponse(rawToCsv(flat), {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "cache-control": "no-store",
          "content-disposition": 'attachment; filename="scores.csv"',
        },
      });
    }
    return NextResponse.json(scores, {
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
