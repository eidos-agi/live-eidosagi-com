// GET  /api/chat           — returns the last 200 non-deleted messages (reverse-chron)
// POST /api/chat           — body { handle, body }; rate-limited per IP; broadcasts via SSE
//
// Rate limit: 1 msg / 5s / IP (server-enforced).
// IP hash: SHA-256(ip + CHAT_IP_SALT). Raw IPs are never stored.
// Bad-word filter: matched messages are stored with deleted_at set so they
// never render, but remain auditable.

import { NextRequest, NextResponse } from "next/server";
import {
  BODY_MAX,
  checkRateLimit,
  hashIp,
  insertMessage,
  listMessages,
  normalizeBody,
  normalizeHandle,
} from "@/lib/chat";
import { containsBadWord } from "@/lib/chat-bad-words";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return null;
}

export async function GET() {
  const messages = listMessages(200);
  return NextResponse.json(
    { messages },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const raw = payload as { handle?: unknown; body?: unknown } | null;
  const handle = normalizeHandle(raw?.handle);
  const body = normalizeBody(raw?.body);

  if (!handle) {
    return NextResponse.json({ error: "invalid_handle" }, { status: 400 });
  }
  if (!body) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (body.length > BODY_MAX) {
    return NextResponse.json({ error: "body_too_long" }, { status: 400 });
  }

  const ipHash = hashIp(clientIp(req));
  const rate = checkRateLimit(ipHash);
  if (!rate.ok) {
    return NextResponse.json(
      { error: "rate_limited", retry_after_ms: rate.retryAfterMs },
      {
        status: 429,
        headers: {
          "retry-after": Math.ceil(rate.retryAfterMs / 1000).toString(),
        },
      },
    );
  }

  const now = Date.now();
  const preDeleted = containsBadWord(body) ? now + 1 : null;

  const msg = insertMessage({
    handle,
    body,
    ipHash,
    deletedAt: preDeleted,
  });

  // Don't expose moderation decision to the poster; they see their message,
  // everyone else sees [removed] (or nothing, since we filter on read).
  return NextResponse.json(
    { message: { ...msg, deleted: false } },
    { status: 201 },
  );
}
