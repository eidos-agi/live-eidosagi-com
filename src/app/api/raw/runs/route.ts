// GET /api/raw/runs?format=json|csv — raw run metadata dump.

import { NextResponse, type NextRequest } from "next/server";
import { loadAllRawData } from "@/lib/leaderboard";
import { rawToCsv, pickFormat } from "../_csv";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const format = pickFormat(req);
  try {
    const { runs } = await loadAllRawData();
    // Flatten gpus + models for CSV legibility.
    const flat = runs.map((r) => ({
      id: r.id,
      startedAt: r.startedAt,
      endedAt: r.endedAt,
      label: r.label ?? "",
      models: r.models.join("|"),
      gpus: r.gpus.map((g) => g.name).join("|"),
      gpuTypes: r.gpus.map((g) => g.type).join("|"),
    }));
    if (format === "csv") {
      return new NextResponse(rawToCsv(flat), {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "cache-control": "no-store",
          "content-disposition": 'attachment; filename="runs.csv"',
        },
      });
    }
    return NextResponse.json(runs, {
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
