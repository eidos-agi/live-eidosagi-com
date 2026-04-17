// POST /api/ingest -- expanded envelope that writes to SQLite.
//
// Auth: X-Ingest-Token must match env INGEST_TOKEN.
//
// Accepted shapes (all `{kind, payload}`):
//   {kind: 'event',         payload: { sessionId, actor, kind, summary, details?, icon?, relatedRun?, ts? }}
//   {kind: 'progress',      payload: { runId, gpuId, model, ... }}
//   {kind: 'score',         payload: { runId, gpuId?, model, useCase, composite, ... }}
//   {kind: 'run_start',     payload: { runId, gpus, models, sessionId?, promptLabel?, note?, startedAt? }}
//   {kind: 'run_end',       payload: { runId, status?, note?, endedAt? }}
//   {kind: 'repo_activity', payload: { repo, kind, url, actor?, ref?, sha?, title?, summary?, meta?, ts? }}
//   {kind: 'artifact',      payload: { kind, label, runId?, sessionId?, url?, bytes?, sha256?, meta?, ts? }}
//
// Legacy shapes (pre-sqlite) are still accepted for wire compatibility:
//   { runId, ts, gpuId, ..., tokenPerSec }       -> progress
//   { runId, testCaseId, composite, dimensions } -> score
//   { run: {...}, payload: <ProgressEvent|EvalScore> }

import { NextResponse } from "next/server";
import {
  insertArtifact,
  insertEvent,
  insertProgress,
  insertRepoActivity,
  insertScore,
  updateRunEnd,
  upsertRunStart,
  type GpuConfig,
} from "@/lib/db";
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

function isLegacyProgress(body: unknown): body is ProgressEvent {
  const b = body as ProgressEvent;
  return (
    !!b &&
    typeof b.runId === "string" &&
    typeof b.ts === "string" &&
    typeof b.gpuId === "string" &&
    typeof b.tokenPerSec === "number"
  );
}

function isLegacyScore(body: unknown): body is EvalScore {
  const b = body as EvalScore;
  return (
    !!b &&
    typeof b.runId === "string" &&
    typeof b.testCaseId === "string" &&
    typeof b.composite === "number" &&
    !!b.dimensions
  );
}

function asObj(x: unknown): Record<string, unknown> | null {
  if (x && typeof x === "object" && !Array.isArray(x)) {
    return x as Record<string, unknown>;
  }
  return null;
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

  const obj = asObj(body);
  if (!obj) return badRequest("expected object");

  const attachedRun = (obj.run ?? null) as Run | null;
  if (attachedRun && typeof attachedRun.id === "string") {
    const existing = await readRunMeta(attachedRun.id);
    if (!existing) await writeRunMeta(attachedRun);
  }

  if (typeof obj.kind === "string" && obj.payload !== undefined) {
    const kind = obj.kind;
    const payload = asObj(obj.payload) ?? {};

    try {
      switch (kind) {
        case "event": {
          const sessionId = String(payload.sessionId ?? "ambient");
          const actor = String(payload.actor ?? "system");
          const evKind = String(payload.kind ?? "observation");
          const summary = String(payload.summary ?? "").trim();
          if (!summary) return badRequest("event.summary required");
          const { id } = insertEvent({
            sessionId,
            actor,
            kind: evKind,
            summary,
            details: asObj(payload.details) ?? {},
            icon: (payload.icon as string | null | undefined) ?? null,
            relatedRun:
              (payload.relatedRun as string | null | undefined) ?? null,
            ts: payload.ts as number | string | undefined,
          });
          return NextResponse.json({ ok: true, id, kind });
        }

        case "progress": {
          const row = insertProgress({
            runId: String(payload.runId ?? ""),
            gpuId: String(payload.gpuId ?? ""),
            model: String(payload.model ?? ""),
            useCase: (payload.useCase as string | undefined) ?? null,
            tokPerSec:
              (payload.tokPerSec as number | undefined) ??
              (payload.tokenPerSec as number | undefined) ??
              null,
            latencyMs: (payload.latencyMs as number | undefined) ?? null,
            vramUsedMb:
              (payload.vramUsedMb as number | undefined) ??
              (payload.vramUsedMB as number | undefined) ??
              null,
            evalIdx:
              (payload.evalIdx as number | undefined) ??
              (payload.evalProgressIdx as number | undefined) ??
              null,
            evalTotal: (payload.evalTotal as number | undefined) ?? null,
            ts: payload.ts as number | string | undefined,
          });
          return NextResponse.json({ ok: true, id: row.id, kind });
        }

        case "score": {
          const row = insertScore({
            runId: String(payload.runId ?? ""),
            gpuId: String(payload.gpuId ?? ""),
            model: String(payload.model ?? ""),
            useCase: String(payload.useCase ?? ""),
            testCaseId: (payload.testCaseId as string | undefined) ?? null,
            composite: (payload.composite as number | undefined) ?? null,
            dimensions: asObj(payload.dimensions),
            tokPerSec:
              (payload.tokPerSec as number | undefined) ??
              (payload.tokenPerSec as number | undefined) ??
              null,
          });
          return NextResponse.json({ ok: true, id: row.id, kind });
        }

        case "run_start": {
          const run = upsertRunStart({
            runId: String(payload.runId ?? ""),
            gpus: (payload.gpus as GpuConfig[] | undefined) ?? [],
            models: (payload.models as string[]) ?? [],
            sessionId: (payload.sessionId as string | undefined) ?? null,
            promptLabel: (payload.promptLabel as string | undefined) ?? null,
            note: (payload.note as string | undefined) ?? null,
            startedAt: payload.startedAt as number | string | undefined,
          });
          return NextResponse.json({ ok: true, id: run.id, kind });
        }

        case "run_end": {
          const run = updateRunEnd({
            runId: String(payload.runId ?? ""),
            status: (payload.status as string | undefined) ?? "completed",
            note: (payload.note as string | undefined) ?? null,
            endedAt: payload.endedAt as number | string | undefined,
          });
          if (!run)
            return NextResponse.json(
              { ok: false, error: "run not found" },
              { status: 404 },
            );
          return NextResponse.json({ ok: true, id: run.id, kind });
        }

        case "repo_activity": {
          const row = insertRepoActivity({
            repo: String(payload.repo ?? ""),
            kind: String(payload.kind ?? ""),
            url: String(payload.url ?? ""),
            actor: (payload.actor as string | undefined) ?? null,
            ref: (payload.ref as string | undefined) ?? null,
            sha: (payload.sha as string | undefined) ?? null,
            title: (payload.title as string | undefined) ?? null,
            summary: (payload.summary as string | undefined) ?? null,
            meta: asObj(payload.meta) ?? {},
            ts: payload.ts as number | string | undefined,
          });
          return NextResponse.json({ ok: true, id: row.id, kind });
        }

        case "artifact": {
          const row = insertArtifact({
            kind: String(payload.kind ?? ""),
            label: String(payload.label ?? ""),
            runId: (payload.runId as string | undefined) ?? null,
            sessionId: (payload.sessionId as string | undefined) ?? null,
            url: (payload.url as string | undefined) ?? null,
            bytes: (payload.bytes as number | undefined) ?? null,
            sha256: (payload.sha256 as string | undefined) ?? null,
            meta: asObj(payload.meta) ?? {},
            ts: payload.ts as number | string | undefined,
          });
          return NextResponse.json({ ok: true, id: row.id, kind });
        }

        default:
          return badRequest(`unknown kind: ${kind}`);
      }
    } catch (err) {
      return NextResponse.json(
        {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        },
        { status: 400 },
      );
    }
  }

  const legacyPayload = (obj.payload ?? obj) as unknown;

  if (isLegacyProgress(legacyPayload)) {
    await appendProgress(legacyPayload);
    const existing = await readRunMeta(legacyPayload.runId);
    if (!existing) {
      await writeRunMeta({
        id: legacyPayload.runId,
        startedAt: legacyPayload.ts,
        endedAt: null,
        gpus: [],
        models: [],
      });
    }
    return NextResponse.json({ ok: true, kind: "progress" });
  }

  if (isLegacyScore(legacyPayload)) {
    await appendScore(legacyPayload);
    return NextResponse.json({ ok: true, kind: "score" });
  }

  return badRequest("payload did not match a known shape");
}
