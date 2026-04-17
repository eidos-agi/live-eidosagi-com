import { NextResponse } from "next/server";
import { readSchedule } from "@/lib/schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const schedule = await readSchedule();
  return NextResponse.json({ schedule });
}
