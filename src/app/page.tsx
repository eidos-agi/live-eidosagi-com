import RaceBoard from "@/components/RaceBoard";
import { listRuns as listRunsDb } from "@/lib/db";
import type { GpuConfig as TypesGpu } from "@/lib/types";

export const dynamic = "force-dynamic";

// Default lane config shown when no run has ever landed.
const DEFAULT_LANES: TypesGpu[] = [
  { name: "gpu-a6000", type: "A6000", vramGB: 48, costPerHour: 0.35 },
  { name: "gpu-a100",  type: "A100",  vramGB: 80, costPerHour: 0.78 },
  { name: "gpu-h100",  type: "H100",  vramGB: 80, costPerHour: 2.49 },
];

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - Date.parse(iso);
  if (!Number.isFinite(diff)) return "";
  const s = Math.max(0, Math.floor(diff / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default async function HomePage() {
  let runs: Awaited<ReturnType<typeof listRunsDb>> = [];
  try {
    runs = listRunsDb(10);
  } catch {
    runs = [];
  }

  const live = runs.find((r) => r.endedAt == null);
  const last = live ?? runs[0] ?? null;
  const gpus =
    last && last.gpus.length > 0
      ? last.gpus.map((g) => ({
          name: g.name,
          type: (g.type as string) ?? "",
          vramGB: (g.vramGB as number) ?? 0,
          costPerHour: (g.costPerHour as number) ?? 0,
        }))
      : DEFAULT_LANES;

  let subtitle: string;
  if (live) {
    subtitle = `Live run: ${live.id}${live.promptLabel ? ` — ${live.promptLabel}` : ""}`;
  } else if (last) {
    subtitle = `Last run: ${last.id} · ${relativeTime(last.endedAt ?? last.startedAt)}${
      last.promptLabel ? ` · ${last.promptLabel}` : ""
    }`;
  } else {
    subtitle =
      "Waiting for data. Start a run on any Thunder Compute instance and POST to /api/ingest.";
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-heading text-3xl font-bold text-workshop-text">
          Three-Lane GPU Race
        </h1>
        <p className="mt-1 text-sm text-workshop-muted">{subtitle}</p>
      </section>
      <RaceBoard runId={last?.id ?? null} lanes={gpus} />
    </div>
  );
}
