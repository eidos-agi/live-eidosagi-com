// POST /api/ingest — accepts ProgressEvent or EvalScore, appends to JSONL.
// Auth: X-Ingest-Token must match env INGEST_TOKEN.

import { NextResponse } from "next/server";
import {
  appendProgress,
  appendScore,
  readRunMeta,
  writeRunMeta,
} from "@/lib/store";
import type { EvalScore, ProgressEvent, Run } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized(msg = "unauthorized"): NextResponse {
  return NextResponse.json({ error: msg }, { status: 401 });
}

function badRequest(msg: string): NextResponse {
  return NextResponse.json({ error: msg }, { status: 400 });
}

function isProgress(body: unknown): body is ProgressEvent {
  const b = body as ProgressEvent;
  return (
    !!b &&
    typeof b.runId === "string" &&
    typeof b.ts === "string" &&
    typeof b.gpuId === "string" &&
    typeof b.tokenPerSec === "number"
  );
}

function isScore(body: unknown): body is EvalScore {
  const b = body as EvalScore;
  return (
    !!b &&
    typeof b.runId === "string" &&
    typeof b.testCaseId === "string" &&
    typeof b.composite === "number" &&
    !!b.dimensions
  );
}

export async function POST(req: Request): Promise<NextResponse> {
  const expected = process.env.INGEST_TOKEN;
  if (!expected) return unauthorized("INGEST_TOKEN not configured");
  const got = req.headers.get("x-ingest-token");
  if (got !== expected) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("invalid json");
  }

  // Allow a wrapper { kind, run?, event } or a bare object we sniff.
  const payload = (body as { payload?: unknown }).payload ?? body;

  // If a run descriptor is attached, upsert it so /runs lists it immediately.
  const runMeta = (body as { run?: Run }).run;
  if (runMeta && typeof runMeta.id === "string") {
    const existing = await readRunMeta(runMeta.id);
    if (!existing) await writeRunMeta(runMeta);
  }

  if (isProgress(payload)) {
    await appendProgress(payload);
    // Auto-create a stub run if needed so the UI doesn't 404 on first event.
    const existing = await readRunMeta(payload.runId);
    if (!existing) {
      await writeRunMeta({
        id: payload.runId,
        startedAt: payload.ts,
        endedAt: null,
        gpus: [],
        models: [],
      });
    }
    return NextResponse.json({ ok: true, kind: "progress" });
  }

  if (isScore(payload)) {
    await appendScore(payload);
    return NextResponse.json({ ok: true, kind: "score" });
  }

  return badRequest("payload did not match ProgressEvent or EvalScore");
}
