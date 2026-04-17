import { NextResponse } from "next/server";
import { readEvents } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const events = await readEvents(id);
  return NextResponse.json({ events });
}
