import { NextRequest, NextResponse } from "next/server";
import { touch } from "@/lib/presence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PingBody {
  clientId?: string;
}

/**
 * Each browser posts here every ~20s with a stable clientId.
 * Returns the current viewer count.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  let clientId: string | undefined;
  try {
    const body = (await req.json()) as PingBody;
    clientId = body.clientId;
  } catch {
    /* missing body — generate from headers */
  }

  if (!clientId) {
    // Fallback: IP + UA hash. Not stable across refreshes, but fine.
    const ip =
      req.headers.get("x-forwarded-for") ??
      req.headers.get("x-real-ip") ??
      "anon";
    const ua = req.headers.get("user-agent") ?? "";
    clientId = `${ip}::${ua.slice(0, 32)}`;
  }

  const n = touch(clientId);
  return NextResponse.json({ watching: n });
}

export async function GET(): Promise<NextResponse> {
  const { count } = await import("@/lib/presence");
  return NextResponse.json({ watching: count() });
}
