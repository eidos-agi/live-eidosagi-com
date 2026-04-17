import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How Crucible measures: model tiers, eval use cases, scoring dimensions, and the Ollama environment.",
};

const MODEL_TIERS = [
  {
    name: "Micro",
    range: "≤ 1B params",
    note: "Edge / on-device candidates",
  },
  {
    name: "Small",
    range: "~2–4B params",
    note: "Laptop-class inference",
  },
  {
    name: "Medium",
    range: "~7–8B params",
    note: "Single-GPU production floor",
  },
  {
    name: "Large",
    range: "~13–14B params",
    note: "Mid-range reasoning",
  },
  {
    name: "XL",
    range: "~30–40B params",
    note: "Dense, multi-GPU capable",
  },
  {
    name: "Flagship",
    range: "≥ 70B params",
    note: "State-of-the-art open weights",
  },
];

const USE_CASES: Array<{ slug: string; title: string; blurb: string }> = [
  {
    slug: "chunking",
    title: "Chunking",
    blurb: "Split long documents into coherent, retrieval-friendly units.",
  },
  {
    slug: "search-query",
    title: "Search query",
    blurb: "Turn a user intent into a precise retrieval query.",
  },
  {
    slug: "delta-summarization",
    title: "Delta summarization",
    blurb: "Summarize only what changed between two documents.",
  },
  {
    slug: "memory-extraction",
    title: "Memory extraction",
    blurb: "Pull durable facts out of a session transcript.",
  },
  {
    slug: "context-synthesis",
    title: "Context synthesis",
    blurb: "Weave N retrieved snippets into one faithful brief.",
  },
  {
    slug: "adapter-extraction",
    title: "Adapter extraction",
    blurb: "Fill a strict schema from unstructured prose.",
  },
  {
    slug: "classification",
    title: "Classification",
    blurb: "Assign a single label from a closed set, with confidence.",
  },
  {
    slug: "embedding-enrichment",
    title: "Embedding enrichment",
    blurb: "Rewrite a chunk to be more embeddable without losing meaning.",
  },
];

const SCORING_DIMENSIONS: Array<{ name: string; weight: string; note: string }> = [
  {
    name: "Correctness",
    weight: "0.40",
    note: "Does it say the true thing?",
  },
  {
    name: "Completeness",
    weight: "0.25",
    note: "Does it say all of the true things it was asked for?",
  },
  {
    name: "Format quality",
    weight: "0.20",
    note: "JSON parses, schema matches, boundaries respected.",
  },
  {
    name: "Conciseness",
    weight: "0.15",
    note: "Extra tokens are a tax. No padding, no hedging.",
  },
];

export default function MethodologyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-10 py-6">
      <header className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-workshop-primary">
          How we measure
        </p>
        <h1 className="font-heading text-4xl font-bold text-workshop-text sm:text-5xl">
          Methodology
        </h1>
        <p className="text-workshop-muted">
          Every score on this site comes from the same pipeline — an open
          eval harness scoring the same model, across the same use cases, in
          the same Ollama environment, on three different GPUs.
        </p>
      </header>

      {/* Raw-data prominence */}
      <section className="rounded border border-workshop-primary/40 bg-workshop-surface/60 p-4">
        <h2 className="font-heading text-lg font-bold text-workshop-text">
          Download raw data
        </h2>
        <p className="mt-1 text-sm text-workshop-muted">
          Everything on this site is open. No login. No rate limit. JSON by
          default, CSV via{" "}
          <code className="font-mono text-workshop-command">?format=csv</code>
          .
        </p>
        <ul className="mt-3 flex flex-wrap gap-3 font-mono text-sm">
          <li>
            <Link
              href="/api/raw/runs"
              className="rounded border border-workshop-muted/30 px-3 py-1.5 text-workshop-command hover:border-workshop-primary hover:text-workshop-primary"
            >
              runs.json
            </Link>
          </li>
          <li>
            <Link
              href="/api/raw/runs?format=csv"
              className="rounded border border-workshop-muted/30 px-3 py-1.5 text-workshop-muted hover:border-workshop-primary hover:text-workshop-primary"
            >
              runs.csv
            </Link>
          </li>
          <li>
            <Link
              href="/api/raw/progress"
              className="rounded border border-workshop-muted/30 px-3 py-1.5 text-workshop-command hover:border-workshop-primary hover:text-workshop-primary"
            >
              progress.json
            </Link>
          </li>
          <li>
            <Link
              href="/api/raw/progress?format=csv"
              className="rounded border border-workshop-muted/30 px-3 py-1.5 text-workshop-muted hover:border-workshop-primary hover:text-workshop-primary"
            >
              progress.csv
            </Link>
          </li>
          <li>
            <Link
              href="/api/raw/scores"
              className="rounded border border-workshop-muted/30 px-3 py-1.5 text-workshop-command hover:border-workshop-primary hover:text-workshop-primary"
            >
              scores.json
            </Link>
          </li>
          <li>
            <Link
              href="/api/raw/scores?format=csv"
              className="rounded border border-workshop-muted/30 px-3 py-1.5 text-workshop-muted hover:border-workshop-primary hover:text-workshop-primary"
            >
              scores.csv
            </Link>
          </li>
        </ul>
      </section>

      {/* Model tiers */}
      <section className="space-y-3">
        <h2 className="font-heading text-2xl font-bold text-workshop-text">
          Six model tiers
        </h2>
        <p className="text-workshop-muted">
          We group models into six tiers by parameter count so the leaderboard
          is readable at a glance. Tier is informational — scores are absolute,
          not tier-relative.
        </p>
        <div className="overflow-hidden rounded border border-workshop-muted/20">
          <table className="w-full text-sm">
            <thead className="bg-workshop-surface/80 text-left">
              <tr>
                <th className="p-3 font-heading font-bold text-workshop-text">
                  Tier
                </th>
                <th className="p-3 font-heading font-bold text-workshop-text">
                  Range
                </th>
                <th className="p-3 font-heading font-bold text-workshop-text">
                  Typical fit
                </th>
              </tr>
            </thead>
            <tbody>
              {MODEL_TIERS.map((t) => (
                <tr
                  key={t.name}
                  className="border-t border-workshop-muted/10"
                >
                  <td className="p-3 font-heading font-bold text-workshop-primary">
                    {t.name}
                  </td>
                  <td className="p-3 font-mono text-workshop-command tnum">
                    {t.range}
                  </td>
                  <td className="p-3 text-workshop-muted">{t.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Eight use cases */}
      <section className="space-y-3">
        <h2 className="font-heading text-2xl font-bold text-workshop-text">
          Eight eval use cases
        </h2>
        <p className="text-workshop-muted">
          These eight tasks were chosen because they are the real shapes an
          agent encounters in production — not trivia, not academic.
        </p>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {USE_CASES.map((uc) => (
            <div
              key={uc.slug}
              className="rounded border border-workshop-muted/20 bg-workshop-surface/40 p-3"
            >
              <dt className="font-heading text-sm font-bold text-workshop-text">
                {uc.title}
              </dt>
              <dd className="mt-1 text-sm text-workshop-muted">{uc.blurb}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Four scoring dimensions */}
      <section className="space-y-3">
        <h2 className="font-heading text-2xl font-bold text-workshop-text">
          Four scoring dimensions
        </h2>
        <p className="text-workshop-muted">
          Every output is scored along four dimensions, then combined into a
          single composite.
        </p>
        <div className="overflow-hidden rounded border border-workshop-muted/20">
          <table className="w-full text-sm">
            <thead className="bg-workshop-surface/80 text-left">
              <tr>
                <th className="p-3 font-heading font-bold text-workshop-text">
                  Dimension
                </th>
                <th className="p-3 font-heading font-bold text-workshop-text">
                  Weight
                </th>
                <th className="p-3 font-heading font-bold text-workshop-text">
                  What it asks
                </th>
              </tr>
            </thead>
            <tbody>
              {SCORING_DIMENSIONS.map((d) => (
                <tr
                  key={d.name}
                  className="border-t border-workshop-muted/10"
                >
                  <td className="p-3 font-heading font-bold text-workshop-primary">
                    {d.name}
                  </td>
                  <td className="p-3 font-mono text-workshop-command tnum">
                    {d.weight}
                  </td>
                  <td className="p-3 text-workshop-muted">{d.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded border border-workshop-muted/20 bg-workshop-surface/60 p-4">
          <p className="font-heading text-sm font-bold text-workshop-text">
            Composite score
          </p>
          <pre className="mt-2 overflow-x-auto font-mono text-xs text-workshop-command">
{`composite =
    0.40 * correctness
  + 0.25 * completeness
  + 0.20 * format_quality
  + 0.15 * conciseness`}
          </pre>
          <p className="mt-2 text-xs text-workshop-muted">
            All dimensions are normalized to [0, 1]. Composite is in [0, 1].
          </p>
        </div>
      </section>

      {/* Ollama env */}
      <section className="space-y-3">
        <h2 className="font-heading text-2xl font-bold text-workshop-text">
          The Ollama environment
        </h2>
        <p className="text-workshop-muted">
          Every instance serves the model under an identical Ollama config, so
          the only meaningful variable is the silicon.
        </p>
        <pre className="overflow-x-auto rounded border border-workshop-muted/20 bg-workshop-surface/60 p-4 font-mono text-sm text-workshop-command">
{`OLLAMA_CONTEXT_LENGTH=8192
OLLAMA_KV_CACHE_TYPE=q4_0
OLLAMA_FLASH_ATTENTION=1`}
        </pre>
      </section>

      {/* How we count savings */}
      <section id="savings" className="space-y-3">
        <h2 className="font-heading text-2xl font-bold text-workshop-text">
          How we count savings
        </h2>
        <p className="text-workshop-muted">
          The strip at the top of the site is a live readout of the
          self-cheapening loop: every activity event used to be narrated by
          hosted Claude, and we&apos;re migrating that narration to a local
          model running on the A6000. The percentage is the share of the last
          24 hours of events authored by local inference (or zero-cost system
          signals like webhooks), computed over a rolling window against the{" "}
          <code className="font-mono text-workshop-command">events</code>{" "}
          table.
        </p>
        <p className="text-workshop-muted">
          The dollar number is a conservative floor. We assume each hosted
          Claude event cost{" "}
          <code className="font-mono text-workshop-command">
            CLAUDE_EVENT_COST_USD
          </code>{" "}
          (default <span className="tnum">$0.004</span>, configurable in{" "}
          <Link
            href="https://github.com/eidos-agi/live-eidosagi-com/blob/main/.env.example"
            className="text-workshop-primary underline-offset-4 hover:underline"
          >
            .env.example
          </Link>
          ) and compare to the counterfactual where every event had been
          hosted. Real Claude API costs vary with prompt size and model; our
          estimate is deliberately low so the published number only ever
          rounds down. Events authored by humans are excluded from the ratio —
          they&apos;re a signal, not an inference cost.
        </p>
      </section>

      {/* Source */}
      <section className="space-y-3">
        <h2 className="font-heading text-2xl font-bold text-workshop-text">
          Source
        </h2>
        <p className="text-workshop-muted">
          The harness that produces every row on this site lives in the open.
          Fork it. File issues. Propose new use cases or dimensions.
        </p>
        <p className="font-mono text-sm">
          <Link
            href="https://github.com/eidos-agi/eidos-server-llm-testing-01"
            className="text-workshop-primary underline-offset-4 hover:underline"
          >
            github.com/eidos-agi/eidos-server-llm-testing-01
          </Link>
        </p>
      </section>

      {/* What we don't do */}
      <section className="space-y-3">
        <h2 className="font-heading text-2xl font-bold text-workshop-text">
          What we don&apos;t do
        </h2>
        <ul className="space-y-2 text-workshop-text">
          <li className="flex gap-3">
            <span className="mt-1 text-workshop-primary">—</span>
            <span>
              <strong className="text-workshop-text">
                No private data in prompts.
              </strong>{" "}
              Every prompt is open-source. If you can&apos;t read it in the
              repo, it isn&apos;t in the eval.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-workshop-primary">—</span>
            <span>
              <strong className="text-workshop-text">
                No vendor-supplied benchmark results.
              </strong>{" "}
              Every number is produced by our harness on hardware we rent and
              pay for. Model card claims are not reproduced here.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-workshop-primary">—</span>
            <span>
              <strong className="text-workshop-text">
                No cloud API models.
              </strong>{" "}
              Only open-weights served through local inference. Closed-API
              models are a different measurement problem — latency is
              dominated by someone else&apos;s datacenter, not the chip.
            </span>
          </li>
        </ul>
      </section>
    </article>
  );
}
