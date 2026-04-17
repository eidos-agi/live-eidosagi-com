import { NextResponse } from "next/server";
import { loadDashboardStats } from "@/lib/dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(loadDashboardStats(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "dashboard_unavailable" },
      { status: 503 },
    );
  }
}
