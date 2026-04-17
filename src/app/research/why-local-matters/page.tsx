import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/lib/db";

// ISR — page reads leaderboard live from DB. 60 s cache keeps first-paint
// fast without losing the "measured today" freshness story.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Why Local Matters",
  description:
    "The evidence behind Crucible: local inference is already cheaper, already here, already yours. Measured, not marketed.",
  openGraph: {
    title: "Why Local Matters · Crucible",
    description:
      "The expensive hourly rate is the cheap per-token rate. Local silicon beats hosted by 50×. Measured 2026-04-17.",
  },
};

interface LeaderboardEntry {
  gpu: string;
  model: string;
  tok_s: number;
  cost_per_hr: number;
  cost_per_m: number;
}

function loadThunderSnapshot(): LeaderboardEntry[] {
  try {
    const db = getDb();
    // Pull the 3 backfilled Thunder runs — each has one GPU + N models.
    const runs = db
      .prepare(
        `SELECT id, gpus, models FROM runs WHERE deleted_at IS NULL
         AND id LIKE 'thunder-%' ORDER BY started_at DESC LIMIT 10`,
      )
      .all() as Array<{ id: string; gpus: string; models: string }>;

    const out: LeaderboardEntry[] = [];
    for (const r of runs) {
      const gpus = JSON.parse(r.gpus) as Array<{
        name: string;
        type: string;
        costPerHour: number;
      }>;
      const gpu = gpus[0];
      if (!gpu) continue;
      const progress = db
        .prepare(
          `SELECT model, tok_per_sec FROM progress
           WHERE run_id = ? AND tok_per_sec > 0`,
        )
        .all(r.id) as Array<{ model: string; tok_per_sec: number }>;
      for (const p of progress) {
        const tokensPerHour = p.tok_per_sec * 3600;
        const costPerM = (gpu.costPerHour / tokensPerHour) * 1_000_000;
        out.push({
          gpu: gpu.type ?? gpu.name,
          model: p.model,
          tok_s: Math.round(p.tok_per_sec * 10) / 10,
          cost_per_hr: gpu.costPerHour,
          cost_per_m: Math.round(costPerM * 100) / 100,
        });
      }
    }
    return out;
  } catch {
    return [];
  }
}

export default function WhyLocalMattersPage() {
  const rows = loadThunderSnapshot();
  // Group by model, sort each group by $/M asc.
  const byModel = new Map<string, LeaderboardEntry[]>();
  for (const r of rows) {
    if (!byModel.has(r.model)) byModel.set(r.model, []);
    byModel.get(r.model)!.push(r);
  }
  for (const arr of byModel.values()) arr.sort((a, b) => a.cost_per_m - b.cost_per_m);

  // Find the "H100 is 4x cheaper" headline model — the one with the biggest spread.
  let headlineModel: string | null = null;
  let headlineSpread = 0;
  for (const [m, arr] of byModel.entries()) {
    if (arr.length >= 2) {
      const ratio = arr[arr.length - 1].cost_per_m / arr[0].cost_per_m;
      if (ratio > headlineSpread) {
        headlineSpread = ratio;
        headlineModel = m;
      }
    }
  }
  const headline = headlineModel ? byModel.get(headlineModel)! : null;

  return (
    <article className="mx-auto max-w-prose space-y-10">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-wider text-workshop-primary">
          research / evidence
        </p>
        <h1 className="mt-2 font-heading text-4xl font-bold text-workshop-text">
          Why Local Matters
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-workshop-text">
          The claim behind <em>Crucible</em> is simple: local AI is already
          here, already cheap, and already yours. Here is the evidence we
          earned for that claim, measured the hard way on three rented GPUs
          at ordinary cloud prices.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="font-heading text-2xl font-semibold text-workshop-primary">
          Finding 1 · The expensive GPU is the cheap one
        </h2>
        <p className="leading-relaxed text-workshop-text">
          Running the <em>same</em> eight-billion-parameter model under the
          same inference config on three Thunder Compute tiers, the most
          expensive hourly rate is the cheapest per token.
        </p>
        {headline && headline.length >= 2 ? (
          <div className="my-6 space-y-3 rounded border border-workshop-muted/25 bg-workshop-surface/60 p-5 font-mono text-sm">
            <div className="text-[11px] uppercase tracking-wider text-workshop-muted">
              live snapshot · {headlineModel}
            </div>
            <table className="w-full tnum">
              <thead className="text-left text-[11px] uppercase tracking-wider text-workshop-muted">
                <tr>
                  <th className="py-1">gpu</th>
                  <th className="py-1">$/hr</th>
                  <th className="py-1 text-right">tok/s</th>
                  <th className="py-1 text-right">$ per 1M tokens</th>
                </tr>
              </thead>
              <tbody>
                {headline.map((row) => {
                  const best = headline[0].cost_per_m;
                  const isBest = row.cost_per_m === best;
                  return (
                    <tr
                      key={`${row.gpu}-${row.model}`}
                      className={isBest ? "text-workshop-command" : ""}
                    >
                      <td className="py-1">{row.gpu}</td>
                      <td className="py-1">${row.cost_per_hr.toFixed(2)}</td>
                      <td className="py-1 text-right">{row.tok_s.toFixed(1)}</td>
                      <td className="py-1 text-right">
                        ${row.cost_per_m.toFixed(2)}
                        {isBest && (
                          <span className="ml-2 text-[10px] uppercase tracking-wider text-workshop-primary">
                            ← winner
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {headlineSpread > 1 && (
              <div className="pt-2 text-[11px] uppercase tracking-wider text-workshop-muted">
                spread: {headlineSpread.toFixed(1)}× cheaper per token on the
                fastest lane
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-workshop-muted">
            Benchmarks pending — first run will populate this table.
          </p>
        )}
        <p className="leading-relaxed text-workshop-text">
          The intuition is hardware-physics. Throughput scales much faster
          than hourly price as you move up Thunder&apos;s tiers — fifteen
          times faster on an H100, only three times the cost. The ratio is
          inverted and the cheap GPU ends up wasting money.
        </p>
        <p className="text-sm text-workshop-muted">
          Evidence grade: REASONED · Measured 2026-04-17 · Ollama 0.21.0 ·
          OLLAMA_CONTEXT_LENGTH=8192 · q4 KV cache · flash-attn. Source:{" "}
          <Link
            href="https://github.com/eidos-agi/cockpit-eidos/blob/main/briefs/2026-04-17-gpu-battery-and-live-eidosagi.md"
            className="text-workshop-primary hover:underline"
          >
            cockpit-eidos/briefs/2026-04-17-gpu-battery-and-live-eidosagi.md
          </Link>
          .
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-heading text-2xl font-semibold text-workshop-primary">
          Finding 2 · A narrator on dedicated silicon is ~50× cheaper
        </h2>
        <p className="leading-relaxed text-workshop-text">
          A freshly-restarted RTX A6000 at $0.35/hr delivers 82 tokens per
          second on llama3.1:8b. A thirty-token headline summary takes{" "}
          <span className="tnum text-workshop-text">~0.37 seconds</span>,
          which costs{" "}
          <span className="tnum text-workshop-command">$0.0000356</span>{" "}
          of GPU time — less than one-hundredth of a cent.
        </p>
        <p className="leading-relaxed text-workshop-text">
          The same summary through a hosted frontier model runs around
          <span className="tnum text-workshop-primary"> $0.004</span> per
          event by conservative estimate. That is approximately fifty times
          more.
        </p>
        <p className="leading-relaxed text-workshop-text">
          And the A6000 is already paid for by the hour — so the marginal
          cost of a summary is effectively zero once the GPU is warm.
          That&apos;s the number powering the mission bar you see above: every
          event authored by the local silicon is ≈50× leverage banked.
        </p>
        <p className="text-sm text-workshop-muted">
          Evidence grade: REASONED · Derived from A6000 unconstrained
          measurement (verified by curl /api/generate) · Thunder
          prototyping price sheet · conservative hosted-event cost floor
          (env <code className="text-workshop-command">CLAUDE_EVENT_COST_USD=0.004</code>).
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-heading text-2xl font-semibold text-workshop-primary">
          Why we&apos;re moving ourselves
        </h2>
        <p className="leading-relaxed text-workshop-text">
          The site is running a live migration of its own narration — from a
          hosted frontier model (Claude, authoring as <em>eidos</em>) to a
          local llama on the A6000 (authoring as <em>eidos-local</em>). The
          mission progress bar in the header shows the split rising toward
          the 90% goal.
        </p>
        <p className="leading-relaxed text-workshop-text">
          We are doing this in public because we believe self-monitoring,
          self-improving AI should do so at lower and lower costs as its
          capabilities grow — the opposite of how the frontier is priced
          today. If the claim is right, the site you are reading will mostly
          be writing itself by the end of the event.
        </p>
      </section>

      <nav className="border-t border-workshop-muted/20 pt-6">
        <ul className="flex flex-wrap gap-4 font-mono text-[11px] uppercase tracking-wider text-workshop-muted">
          <li>
            <Link href="/methodology" className="hover:text-workshop-primary">
              methodology →
            </Link>
          </li>
          <li>
            <Link href="/models" className="hover:text-workshop-primary">
              leaderboard →
            </Link>
          </li>
          <li>
            <Link href="/" className="hover:text-workshop-primary">
              watch the race →
            </Link>
          </li>
          <li>
            <Link href="/human-tasks" className="hover:text-workshop-primary">
              human tasks →
            </Link>
          </li>
        </ul>
      </nav>
    </article>
  );
}
