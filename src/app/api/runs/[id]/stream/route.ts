// SSE endpoint that tails the `progress` table for a given run.
//
// Polling-based tail -- watches for new rows since the last seen id. Simple
// and reliable; good enough for a handful of clients. Upgrade to LISTEN/NOTIFY
// or a fan-out queue when we need it.

import { getDb, getRun } from "@/lib/db";
import type { ProgressEvent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POLL_MS = 500;

interface ProgressRow {
  id: number;
  ts: number;
  run_id: string;
  gpu_id: string;
  model: string;
  use_case: string | null;
  tok_per_sec: number | null;
  latency_ms: number | null;
  vram_used_mb: number | null;
  eval_idx: number | null;
  eval_total: number | null;
}

function rowToLegacy(row: ProgressRow): ProgressEvent {
  return {
    runId: row.run_id,
    ts: new Date(row.ts).toISOString(),
    gpuId: row.gpu_id,
    model: row.model,
    useCase: row.use_case ?? "",
    tokenPerSec: row.tok_per_sec ?? 0,
    latencyMs: row.latency_ms ?? 0,
    vramUsedMB: row.vram_used_mb ?? 0,
    evalProgressIdx: row.eval_idx ?? 0,
    evalTotal: row.eval_total ?? 0,
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const run = getRun(id);
  if (!run) return new Response("not found", { status: 404 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let lastId = 0;
      let closed = false;

      const send = (data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const tick = () => {
        if (closed) return;
        try {
          const rows = getDb()
            .prepare(
              `SELECT id, ts, run_id, gpu_id, model, use_case, tok_per_sec,
                      latency_ms, vram_used_mb, eval_idx, eval_total
               FROM progress
               WHERE run_id = ? AND id > ?
               ORDER BY id ASC
               LIMIT 500`,
            )
            .all(id, lastId) as ProgressRow[];
          for (const r of rows) {
            send(rowToLegacy(r));
            if (r.id > lastId) lastId = r.id;
          }
        } catch {
          // ignore; next tick may succeed
        }
        if (!closed) setTimeout(tick, POLL_MS);
      };

      const heartbeat = setInterval(() => {
        if (closed) return;
        controller.enqueue(encoder.encode(`: keepalive\n\n`));
      }, 15000);

      controller.enqueue(
        encoder.encode(
          `event: ready\ndata: {"runId":${JSON.stringify(id)}}\n\n`,
        ),
      );
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
