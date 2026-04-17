import Link from "next/link";
import { listModels } from "@/lib/db";

// /models/catalog — the registry view. Sibling to /models (which shows
// live throughput/cost derived from progress + scores). This view shows
// what the model IS, not how fast it ran.

export const metadata = {
  title: "Model Registry · live.eidosagi.com",
  description:
    "What we've pulled, what we run, what we default to. Seeded from the H100 lineup.",
};

export const dynamic = "force-dynamic";

function fmtSize(gb: number | null): string {
  if (gb == null) return "—";
  if (gb < 1) return `${(gb * 1000).toFixed(0)} MB`;
  if (gb < 10) return `${gb.toFixed(1)} GB`;
  return `${gb.toFixed(0)} GB`;
}

function fmtParams(b: number | null): string {
  if (b == null) return "—";
  if (b < 1) return `${(b * 1000).toFixed(0)} M`;
  if (b < 10) return `${b.toFixed(1)} B`;
  return `${b.toFixed(0)} B`;
}

export default function ModelsCatalogPage() {
  const models = listModels();

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 text-workshop-text">
      <header className="mb-6">
        <div className="flex items-baseline gap-4">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Model Registry
          </h1>
          <span className="font-mono text-xs uppercase tracking-wider text-workshop-muted">
            {models.length} models
          </span>
        </div>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-workshop-text/90">
          The weights we&apos;ve pulled onto the H100, what they are, and what
          we do with them. Seeded from the live lineup and updated whenever
          the race script or harness pulls a new tag.
        </p>
        <p className="mt-2 font-mono text-xs uppercase tracking-wider text-workshop-muted">
          see also:{" "}
          <Link
            href="/models"
            className="text-workshop-primary hover:underline"
          >
            live leaderboard
          </Link>{" "}
          · <Link href="/api/models/catalog" className="hover:underline">raw json</Link>
        </p>
      </header>

      {models.length === 0 ? (
        <div className="rounded border border-workshop-muted/30 bg-workshop-surface/40 p-8 text-center font-mono text-sm text-workshop-muted">
          no models registered yet — migration 005 not applied?
        </div>
      ) : (
        <div className="overflow-hidden rounded border border-workshop-muted/20 bg-workshop-surface/40">
          <table className="w-full text-sm">
            <thead className="border-b border-workshop-muted/20 bg-workshop-bg/40 font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Family</th>
                <th className="px-3 py-2 text-left">Arch</th>
                <th className="px-3 py-2 text-right">Params</th>
                <th className="px-3 py-2 text-right">Active</th>
                <th className="px-3 py-2 text-right">Size</th>
                <th className="px-3 py-2 text-left">Released</th>
                <th className="px-3 py-2 text-left">License</th>
                <th className="px-3 py-2 text-left">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-workshop-muted/10">
              {models.map((m) => {
                const role: { label: string; tone: string }[] = [];
                if (m.defaultInHarness)
                  role.push({
                    label: "harness default",
                    tone: "text-workshop-command",
                  });
                if (m.inRaceRotation)
                  role.push({
                    label: "race rotation",
                    tone: "text-workshop-primary",
                  });
                if (m.pulledOnH100 && role.length === 0)
                  role.push({
                    label: "on H100",
                    tone: "text-workshop-muted",
                  });
                return (
                  <tr
                    key={m.name}
                    className="hover:bg-workshop-primary/5"
                  >
                    <td className="px-3 py-2 font-mono text-[13px] text-workshop-text">
                      {m.name}
                    </td>
                    <td className="px-3 py-2 font-mono text-[12px] text-workshop-muted">
                      {m.family}
                      {m.generation ? ` ${m.generation}` : ""}
                    </td>
                    <td className="px-3 py-2 font-mono text-[12px] text-workshop-muted">
                      {m.architecture ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tnum text-[12px] text-workshop-text">
                      {fmtParams(m.totalParamsB)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tnum text-[12px] text-workshop-text">
                      {m.architecture === "moe"
                        ? fmtParams(m.activeParamsB)
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tnum text-[12px] text-workshop-muted">
                      {fmtSize(m.sizeGB)}
                    </td>
                    <td className="px-3 py-2 font-mono text-[12px] text-workshop-muted">
                      {m.releasedAt ?? "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-workshop-muted">
                      {m.license ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1.5">
                        {role.map((r) => (
                          <span
                            key={r.label}
                            className={`rounded border border-current/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${r.tone}`}
                          >
                            {r.label}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <section className="mt-8 rounded border border-workshop-muted/20 bg-workshop-surface/30 p-5 text-[13px] leading-relaxed text-workshop-muted">
        <p>
          <span className="font-mono text-workshop-text">How this stays fresh:</span>{" "}
          entries are seeded by migration 005 and upserted by the race script + harness
          whenever they pull a new tag. There is no manual list to keep in sync across
          files — this table IS the list. Deleted entries soft-delete (<code>deleted_at</code>);
          nothing is ever dropped.
        </p>
      </section>
    </main>
  );
}
