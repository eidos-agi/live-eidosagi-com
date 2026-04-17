import CompareBoard from "@/components/CompareBoard";
import { listRuns, readEvents, readScores } from "@/lib/store";
import type { EvalScore, ProgressEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ComparePage() {
  // Aggregate across all runs. For each (model, gpuType) we track the mean
  // tok/s (from events) and mean composite (from scores).
  const runs = await listRuns();
  const allEvents: Array<ProgressEvent & { gpuType: string }> = [];
  const allScores: EvalScore[] = [];

  for (const run of runs) {
    const events = await readEvents(run.id);
    const gpuTypeById = new Map(run.gpus.map((g) => [g.name, g.type] as const));
    for (const e of events) {
      allEvents.push({ ...e, gpuType: gpuTypeById.get(e.gpuId) ?? e.gpuId });
    }
    const scores = await readScores(run.id);
    allScores.push(...scores);
  }

  return <CompareBoard events={allEvents} scores={allScores} />;
}
