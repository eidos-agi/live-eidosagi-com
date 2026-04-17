import { NextResponse } from "next/server";
import { readRunMeta, readScores } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const run = await readRunMeta(id);
  if (!run) return NextResponse.json({ error: "not found" }, { status: 404 });
  const scores = await readScores(id);
  return NextResponse.json({ run, scores });
}
