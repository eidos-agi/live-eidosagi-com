// SSE: GET /api/events/stream
//
// On connect: sends { type: "initial", events: [...] } — last N reverse-chron.
// On insert : sends { type: "event", event: {...} } to every subscriber.
// Keep-alive: a ":ping" comment every 15s so proxies don't close the pipe.
//
// Query: ?limit=80 (default 80, max 500), ?session=xyz (optional filter).

import type { NextRequest } from "next/server";
import {
  listEvents,
  subscribeEvents,
  type ActivityEvent,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = Math.max(
    1,
    Math.min(500, Number.parseInt(url.searchParams.get("limit") ?? "80", 10) ||
      80),
  );
  const sessionFilter = url.searchParams.get("session");

  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (payload: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
          );
        } catch {
          // closed
        }
      };
      const sendComment = (c: string) => {
        try {
          controller.enqueue(encoder.encode(`: ${c}\n\n`));
        } catch {
          // closed
        }
      };

      // Initial dump — same shape /api/events returns (reverse-chron).
      try {
        send({
          type: "initial",
          events: listEvents({
            limit,
            sessionId: sessionFilter ?? undefined,
          }),
        });
      } catch {
        send({ type: "initial", events: [] });
      }

      const unsub = subscribeEvents((ev: ActivityEvent) => {
        if (sessionFilter && ev.sessionId !== sessionFilter) return;
        send({ type: "event", event: ev });
      });

      const ping = setInterval(() => {
        sendComment(`ping ${Date.now()}`);
      }, 15_000);

      cleanup = () => {
        clearInterval(ping);
        unsub();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-store, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
