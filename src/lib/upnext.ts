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
  // Supports two formats:
  //
  // A. Legacy H2-style:
  //      # TASK-0001 - Title
  //      ## Status: To Do
  //      ## Priority: High
  //
  // B. YAML fenced (preferred, matches newer tasks):
  //      ---
  //      id: TASK-0025
  //      title: 'foo'
  //      status: To Do
  //      priority: Urgent
  //      ---
  const out: Record<string, string> = {};

  // Pass A: H2 headers
  for (const line of body.split("\n")) {
    const m = line.match(/^##\s+([A-Za-z ]+?):\s*(.+?)\s*$/);
    if (m) out[m[1].trim().toLowerCase()] = m[2].trim();
  }

  // Pass B: YAML fenced frontmatter at top of file
  const yamlMatch = body.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (yamlMatch) {
    for (const rawLine of yamlMatch[1].split("\n")) {
      const m = rawLine.match(/^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*?)\s*$/);
      if (!m) continue;
      const key = m[1].trim().toLowerCase();
      let val = m[2].trim();
      // Strip matching single/double quotes around the value.
      if (
        (val.startsWith("'") && val.endsWith("'")) ||
        (val.startsWith('"') && val.endsWith('"'))
      ) {
        val = val.slice(1, -1);
      }
      if (val) out[key] = val;
    }
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
    const id = fm.id ?? titleMatch?.[1] ?? f.split(" ")[0];
    // Prefer YAML title, then H1, then filename fallback (cleaned up).
    const fallbackTitle = f.replace(/^TASK-\d+\s*-\s*/, "").replace(/\.md$/, "");
    const title = fm.title ?? titleMatch?.[2] ?? fallbackTitle;

    // Description = everything after "## Description" H2, or the body text
    // after the YAML frontmatter close, whichever is richer.
    let description = "";
    const descIdx = body.toLowerCase().indexOf("## description");
    if (descIdx >= 0) {
      description = body.slice(descIdx).replace(/^## description\s*\n/i, "").trim();
    } else {
      const yamlEnd = body.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
      if (yamlEnd) description = body.slice(yamlEnd[0].length).trim();
    }

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
