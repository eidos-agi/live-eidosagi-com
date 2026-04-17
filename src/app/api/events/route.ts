import { NextResponse } from "next/server";
import { listEvents } from "@/lib/events";

// Public read endpoint. Returns [] when DATABASE_URL is unset.
// GET /api/events?limit=50&session=<session_id>
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const limitRaw = url.searchParams.get("limit");
  const session = url.searchParams.get("session");
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 50;

  const events = await listEvents({
    limit: Number.isFinite(limit) ? limit : 50,
    sessionId: session && session.length > 0 ? session : null,
  });

  return NextResponse.json(
    { events },
    {
      headers: {
        // Tiny cache window — the home strip polls every 3s
        "Cache-Control": "no-store",
      },
    },
  );
}
