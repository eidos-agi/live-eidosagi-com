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
    // Registry updates on ollama-pull cadence (hours). 5 min CDN cache is safe.
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } },
  );
}
