import { NextResponse } from "next/server";
import { listModels } from "@/lib/db";

// Read endpoint for the models registry.
// GET /api/models/catalog -> { models: ModelRow[] }
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const models = listModels();
  return NextResponse.json(
    { models, count: models.length },
    { headers: { "Cache-Control": "no-store" } },
  );
}
