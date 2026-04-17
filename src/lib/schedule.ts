// Schedule loader — reads data/schedule.json at runtime.
// Simple, fs-based. OK for our low-frequency, committed-in-repo cadence.

import { promises as fs } from "node:fs";
import path from "node:path";

export interface ScheduledRun {
  id: string;
  startsAt: string;
  model: string;
  gpus: string[];
  label: string;
  prompt?: string;
}

interface ScheduleFile {
  schedule: ScheduledRun[];
}

const FILE = path.join(process.cwd(), "data", "schedule.json");

export async function readSchedule(): Promise<ScheduledRun[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as ScheduleFile;
    return parsed.schedule ?? [];
  } catch {
    return [];
  }
}
