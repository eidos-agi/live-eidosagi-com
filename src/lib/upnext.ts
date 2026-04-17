// Read the ike task tree (.ike/tasks/*.md) and derive:
//   - priority-ordered list of open tasks
//   - Eisenhower quadrant for each (Urgent x Important)
//
// No runtime DB — the ike directory is committed into the repo, which
// means the site's current workspace is the authoritative source at
// build/render time.

import fs from "node:fs";
import path from "node:path";

export type Priority = "urgent" | "high" | "normal" | "low";
export type Status = "To Do" | "In Progress" | "Done" | "Blocked" | string;

export interface UpNextTask {
  id: string;
  title: string;
  status: Status;
  priority: Priority;
  description: string;
  filename: string;
  /** Eisenhower quadrant — derived. */
  quadrant: "do" | "schedule" | "delegate" | "drop";
  /** Derived ranking used for list order. Lower is higher priority. */
  rank: number;
}

const PRIORITY_RANK: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

function priorityOf(raw: string | undefined): Priority {
  const v = (raw ?? "").toLowerCase();
  if (v === "urgent") return "urgent";
  if (v === "high") return "high";
  if (v === "low") return "low";
  return "normal";
}

function parseFrontMatter(body: string): Record<string, string> {
  // Tasks stored like:
  //   # TASK-0001 - Title
  //   ## Status: To Do
  //   ## Priority: High
  //   ## Milestone: ...
  //   ## Description
  //   ...
  const out: Record<string, string> = {};
  for (const line of body.split("\n")) {
    const m = line.match(/^##\s+([A-Za-z ]+?):\s*(.+?)\s*$/);
    if (m) out[m[1].trim().toLowerCase()] = m[2].trim();
  }
  return out;
}

function quadrantFor(
  priority: Priority,
  status: Status,
): UpNextTask["quadrant"] {
  if (status.toLowerCase() === "blocked") return "delegate";
  if (priority === "urgent") return "do";
  if (priority === "high") return "schedule";
  if (priority === "low") return "drop";
  return "schedule";
}

export function loadUpNext(): UpNextTask[] {
  const dir = path.join(process.cwd(), ".ike", "tasks");
  let files: string[];
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }

  const tasks: UpNextTask[] = [];
  for (const f of files) {
    const filepath = path.join(dir, f);
    let body: string;
    try {
      body = fs.readFileSync(filepath, "utf8");
    } catch {
      continue;
    }
    const fm = parseFrontMatter(body);
    const status = fm.status ?? "To Do";
    if (status.toLowerCase() === "done") continue;

    const titleMatch = body.match(/^#\s+(TASK-\d+)\s*[-—]\s*(.+?)\s*$/m);
    const id = titleMatch?.[1] ?? f.split(" ")[0];
    const title = titleMatch?.[2] ?? f;

    // Description = everything after "## Description" line (or empty)
    const descIdx = body.toLowerCase().indexOf("## description");
    const description =
      descIdx >= 0 ? body.slice(descIdx).replace(/^## description\s*\n/i, "").trim() : "";

    const priority = priorityOf(fm.priority);
    tasks.push({
      id,
      title,
      status,
      priority,
      description: description.slice(0, 600),
      filename: f,
      quadrant: quadrantFor(priority, status),
      rank: 0,
    });
  }

  // Rank: by priority, then by id order (earlier = higher rank).
  tasks.sort((a, b) => {
    const p = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (p !== 0) return p;
    return a.id.localeCompare(b.id);
  });
  tasks.forEach((t, i) => {
    t.rank = i + 1;
  });
  return tasks;
}
