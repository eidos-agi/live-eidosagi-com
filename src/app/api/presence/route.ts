import { NextResponse } from "next/server";
import { count } from "@/lib/presence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Simple count endpoint — used for the viewer chip. */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ watching: count() });
}
