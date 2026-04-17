// Tiny CSV helper shared by the /api/raw/* routes. Not a public route — the
// leading underscore in the folder would make Next route-ignore it, but just
// to be safe this module lives as a `.ts` (not `route.ts`).

import type { NextRequest } from "next/server";

export function pickFormat(req: NextRequest): "csv" | "json" {
  const fmt = req.nextUrl.searchParams.get("format")?.toLowerCase();
  return fmt === "csv" ? "csv" : "json";
}

function escape(cell: unknown): string {
  if (cell == null) return "";
  const s = typeof cell === "string" ? cell : JSON.stringify(cell);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function rawToCsv(rows: ReadonlyArray<Record<string, unknown> | object>): string {
  if (rows.length === 0) return "";
  const rowsAsRecords = rows as ReadonlyArray<Record<string, unknown>>;
  const header: string[] = [];
  const seen = new Set<string>();
  for (const r of rowsAsRecords) {
    for (const k of Object.keys(r)) {
      if (!seen.has(k)) {
        seen.add(k);
        header.push(k);
      }
    }
  }
  const lines: string[] = [header.join(",")];
  for (const r of rowsAsRecords) {
    lines.push(header.map((k) => escape(r[k])).join(","));
  }
  return lines.join("\n") + "\n";
}
