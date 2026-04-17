// SSE: GET /api/chat/stream
//
// On connect: sends { type: "initial", messages: [...] } with last 200 msgs
//             (reverse-chron; client reverses for display).
// On insert : sends { type: "message", message: {...} } to every subscriber.
// Keep-alive: a ":ping" comment every 15s to keep proxies from closing.

import type { NextRequest } from "next/server";
import { listMessages, subscribe, type ChatMessage } from "@/lib/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
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

      // Initial dump
      send({ type: "initial", messages: listMessages(200) });

      const unsub = subscribe((msg: ChatMessage) => {
        if (msg.deleted) return;
        send({ type: "message", message: msg });
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
