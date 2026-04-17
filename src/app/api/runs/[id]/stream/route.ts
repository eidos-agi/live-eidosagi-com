// SSE endpoint that tails events.jsonl for a given run.
// Simple polling tail — good enough for a handful of clients; upgrade later.

import { eventsFilePath, runExistsSync } from "@/lib/store";
import { promises as fs } from "node:fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POLL_MS = 500;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  if (!runExistsSync(id)) {
    return new Response("not found", { status: 404 });
  }

  const file = eventsFilePath(id);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let position = 0;
      let closed = false;
      let buffered = "";

      const send = (data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const tick = async () => {
        if (closed) return;
        try {
          const stat = await fs.stat(file).catch(() => null);
          if (stat && stat.size > position) {
            const fh = await fs.open(file, "r");
            try {
              const toRead = stat.size - position;
              const buf = Buffer.alloc(toRead);
              await fh.read(buf, 0, toRead, position);
              position = stat.size;
              buffered += buf.toString("utf8");
              const lines = buffered.split("\n");
              buffered = lines.pop() ?? "";
              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                try {
                  send(JSON.parse(trimmed));
                } catch {
                  // skip malformed
                }
              }
            } finally {
              await fh.close();
            }
          }
        } catch {
          // ignore; next tick may succeed
        }
        if (!closed) setTimeout(tick, POLL_MS);
      };

      // Heartbeat so proxies don't kill an idle connection.
      const heartbeat = setInterval(() => {
        if (closed) return;
        controller.enqueue(encoder.encode(`: keepalive\n\n`));
      }, 15000);

      controller.enqueue(encoder.encode(`event: ready\ndata: {"runId":${JSON.stringify(id)}}\n\n`));
      tick();

      const abort = () => {
        closed = true;
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };
      // Close when the client disconnects.
      _req.signal.addEventListener("abort", abort);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
