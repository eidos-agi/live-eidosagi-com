// Filesystem-backed JSONL store for runs, progress events, and eval scores.
// No DB on purpose — runs are append-only flat files under data/runs/<id>/.

import { promises as fs } from "node:fs";
import fssync from "node:fs";
import path from "node:path";
import type {
  EvalScore,
  ProgressEvent,
  Run,
} from "./types";

const DATA_ROOT = path.join(process.cwd(), "data", "runs");

function runDir(runId: string): string {
  return path.join(DATA_ROOT, runId);
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

/** Read a run's metadata.json if present. Returns null if the run doesn't exist. */
export async function readRunMeta(runId: string): Promise<Run | null> {
  const file = path.join(runDir(runId), "run.json");
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as Run;
  } catch {
    return null;
  }
}

/** Write/overwrite a run's metadata. */
export async function writeRunMeta(run: Run): Promise<void> {
  await ensureDir(runDir(run.id));
  await fs.writeFile(
    path.join(runDir(run.id), "run.json"),
    JSON.stringify(run, null, 2),
    "utf8",
  );
}

/** List every run that has a run.json file. Returns newest first. */
export async function listRuns(): Promise<Run[]> {
  try {
    const entries = await fs.readdir(DATA_ROOT, { withFileTypes: true });
    const runs: Run[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const meta = await readRunMeta(entry.name);
      if (meta) runs.push(meta);
    }
    runs.sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
    return runs;
  } catch {
    return [];
  }
}

async function appendJsonl(file: string, obj: unknown): Promise<void> {
  await ensureDir(path.dirname(file));
  await fs.appendFile(file, JSON.stringify(obj) + "\n", "utf8");
}

export async function appendProgress(ev: ProgressEvent): Promise<void> {
  await appendJsonl(path.join(runDir(ev.runId), "events.jsonl"), ev);
}

export async function appendScore(score: EvalScore): Promise<void> {
  await appendJsonl(path.join(runDir(score.runId), "scores.jsonl"), score);
}

async function readJsonl<T>(file: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(file, "utf8");
    return raw
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as T);
  } catch {
    return [];
  }
}

export function readEvents(runId: string): Promise<ProgressEvent[]> {
  return readJsonl<ProgressEvent>(path.join(runDir(runId), "events.jsonl"));
}

export function readScores(runId: string): Promise<EvalScore[]> {
  return readJsonl<EvalScore>(path.join(runDir(runId), "scores.jsonl"));
}

/** Path to the events file for SSE tailing. Sync version for watcher setup. */
export function eventsFilePath(runId: string): string {
  return path.join(runDir(runId), "events.jsonl");
}

/** Existence check used by SSE route to avoid EACCES/ENOENT noise. */
export function runExistsSync(runId: string): boolean {
  return fssync.existsSync(path.join(runDir(runId), "run.json"));
}
