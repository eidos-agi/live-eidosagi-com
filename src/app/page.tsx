import RaceBoard from "@/components/RaceBoard";
import { listRuns } from "@/lib/store";

export const dynamic = "force-dynamic";

// Default lane config shown when no live run exists yet.
// These reflect the three Thunder Compute instances referenced in the brief.
const DEFAULT_LANES = [
  {
    name: "gpu-a6000",
    type: "A6000",
    vramGB: 48,
    costPerHour: 0.5,
  },
  {
    name: "gpu-a100",
    type: "A100",
    vramGB: 80,
    costPerHour: 1.29,
  },
  {
    name: "gpu-h100",
    type: "H100",
    vramGB: 80,
    costPerHour: 2.49,
  },
] as const;

export default async function HomePage() {
  const runs = await listRuns();
  // "Live" = most recent run with endedAt == null. Fall back to most recent.
  const live = runs.find((r) => r.endedAt == null) ?? runs[0] ?? null;
  const gpus = live && live.gpus.length > 0 ? live.gpus : DEFAULT_LANES.slice();

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold text-white">
          Three-Lane GPU Race
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          {live
            ? `Live run: ${live.id}${live.label ? ` — ${live.label}` : ""}`
            : "Waiting for data. Start a run on any Thunder Compute instance and POST to /api/ingest."}
        </p>
      </section>
      <RaceBoard runId={live?.id ?? null} lanes={gpus} />
    </div>
  );
}
