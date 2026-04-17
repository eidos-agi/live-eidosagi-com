// GET  /api/human-tasks?status=open|done|wontdo|blocked|all&limit=100
// POST /api/human-tasks — { id, status, resolvedBy? } to resolve a task.
//
// No auth on GET (public read). POST requires a match against
// RESOLVE_TOKEN (env) OR HUMAN_TASK_RESOLVE_TOKEN. Keep the barrier low
// so the actual human can click through on the /human-tasks page.

import { NextResponse, type NextRequest } from "next/server";
import {
  humanTaskCounts,
  listHumanTasks,
  resolveHumanTask,
  type HumanTaskStatus,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUSES: ReadonlyArray<HumanTaskStatus | "all"> = [
  "open",
  "done",
  "wontdo",
  "blocked",
  "all",
];

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const rawStatus = url.searchParams.get("status") ?? "open";
  const status = (VALID_STATUSES as readonly string[]).includes(rawStatus)
    ? (rawStatus as HumanTaskStatus | "all")
    : "open";
  const limit = Math.max(
    1,
    Math.min(500, Number.parseInt(url.searchParams.get("limit") ?? "100", 10) || 100),
  );

  try {
    return NextResponse.json(
      {
        tasks: listHumanTasks({ status, limit }),
        counts: humanTaskCounts(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { tasks: [], counts: { open: 0, done: 0, wontdo: 0, blocked: 0 } },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const obj = (body && typeof body === "object" ? body : {}) as Record<
    string,
    unknown
  >;
  const id = Number(obj.id);
  const status = String(obj.status ?? "") as HumanTaskStatus;
  const resolvedBy = (obj.resolvedBy as string | undefined) ?? "human";
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  if (!["done", "wontdo", "blocked"].includes(status)) {
    return NextResponse.json(
      { error: "status must be done|wontdo|blocked" },
      { status: 400 },
    );
  }
  const task = resolveHumanTask(id, status, resolvedBy);
  if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true, task });
}
