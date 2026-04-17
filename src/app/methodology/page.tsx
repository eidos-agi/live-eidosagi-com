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

      <section id="benchmarks" className="space-y-6">
        <h2 className="font-heading text-2xl font-bold text-workshop-primary">
          Benchmarks — opinions and dead ends
        </h2>

        <p className="leading-relaxed text-workshop-text">
          Most published LLM benchmarks measure whatever is easy to measure.
          That&apos;s why the leaderboards don&apos;t change your mind. Here
          are the arguments behind our harness — what we measure, what we
          refuse to measure, and what we&apos;re still unsure of.
        </p>

        <aside className="rounded border border-workshop-primary/30 bg-workshop-surface/50 p-4 text-sm leading-relaxed text-workshop-text">
          <div className="font-mono text-[10px] uppercase tracking-wider text-workshop-primary">
            caveat · measurement conditions
          </div>
          <p className="mt-2">
            The numbers on the homepage and the leaderboard come from
            GPUs <em>rented on Thunder Compute</em>, running Ollama
            through a virtualization layer. They are measurements of a
            rental tier, not a hardware ceiling.
          </p>
          <p className="mt-2">
            Specifically — our{" "}
            <span className="tnum text-workshop-command">H100 @ $2.49/hr</span> is
            Thunder&apos;s production tier, running un-shared. Our{" "}
            <span className="tnum text-workshop-muted">A100 @ $0.78/hr</span> and{" "}
            <span className="tnum text-workshop-muted">A6000 @ $0.35/hr</span> are
            the <em>prototyping</em> tier, which virtualizes the GPU and
            shares it across tenants. We&apos;ve observed A100 at 13–15 tok/s
            on llama3.1:8b in that harness — a large delta from the
            native-hardware ceiling and mostly a story about cloud
            plumbing, not silicon.
          </p>
          <p className="mt-2">
            The <em>$/M-tokens</em> story survives that caveat — prototyping
            tiers are what a small team can actually rent, so
            &quot;cheapest hourly is most expensive per token&quot; is a
            real user experience, not a theoretical one. The{" "}
            <em>raw throughput comparison</em> does not; treat it as a
            lower bound on what the silicon can do.
          </p>
        </aside>

        <h3 className="font-heading text-lg font-semibold text-workshop-text">
          Opinions we hold
        </h3>
        <ul className="space-y-3 text-sm text-workshop-text">
          <li className="flex gap-3">
            <span className="mt-1 text-workshop-primary">◆</span>
            <span>
              <strong className="text-workshop-text">
                Tokens per second is not the benchmark.
              </strong>{" "}
              It&apos;s a denominator. The real benchmark is{" "}
              <span className="tnum text-workshop-command">
                dollars per million tokens at a usable quality floor
              </span>
              . A model that generates 300 tok/s of slop is worse than one
              that generates 30 tok/s of correct prose.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-workshop-primary">◆</span>
            <span>
              <strong className="text-workshop-text">
                Prototyping-tier cloud GPUs are a mirage.
              </strong>{" "}
              Virtualized GPU at a low hourly price hides the fact that
              throughput collapses under contention. The same llama3.1:8b
              ran at 126.6 tok/s on H100 production and 4.3 tok/s on A6000
              prototyping in our runs. Dollars per token: inverted.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-workshop-primary">◆</span>
            <span>
              <strong className="text-workshop-text">
                Quality rubrics must be adversarial.
              </strong>{" "}
              Asking a model to score itself is performance theater. Every
              eval here uses an external judge with a rubric the model
              can&apos;t see, and every dimension is scored independently.
              If two dimensions correlate perfectly over a week, one of them
              is leaking.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-workshop-primary">◆</span>
            <span>
              <strong className="text-workshop-text">
                Latency matters, but throughput matters more.
              </strong>{" "}
              First-token latency sells demos; steady-state throughput pays
              the bill. We publish both, and we sort the leaderboard on the
              money metric by default.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-workshop-primary">◆</span>
            <span>
              <strong className="text-workshop-text">
                KV-cache quantization is free money for most use cases.
              </strong>{" "}
              We run with{" "}
              <code className="text-workshop-command">
                OLLAMA_KV_CACHE_TYPE=q4_0
              </code>
              and have yet to find a workload where it hurts composite score
              at a detectable level. We&apos;d love to be proven wrong — file
              a counter-example.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-workshop-primary">◆</span>
            <span>
              <strong className="text-workshop-text">
                Public benchmarks rot.
              </strong>{" "}
              Every number on this site decays in trustworthiness the moment
              the underlying model release ships. We re-run the full suite
              every week on the same hardware, and only the latest run drives
              the dashboard. Historical runs are in <code>/runs</code>.
            </span>
          </li>
        </ul>

        <h3 className="mt-6 font-heading text-lg font-semibold text-workshop-text">
          Dead ends we abandoned
        </h3>
        <ul className="space-y-3 text-sm text-workshop-text">
          <li className="flex gap-3">
            <span className="mt-1 text-workshop-danger">—</span>
            <span>
              <strong>CPU-only inference benchmarks.</strong> Ran them on a
              128-thread EPYC. At our model tiers, CPU is ~15× slower than
              even a virtualized GPU. The measurement is correct and the
              answer is boring. We stopped publishing.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-workshop-danger">—</span>
            <span>
              <strong>Single-prompt quality judgments.</strong> Asking &quot;
              did the model answer this one prompt correctly?&quot; is a coin
              toss. We moved to rubric-scored batches of at least 20 prompts
              per use case before a score is published.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-workshop-danger">—</span>
            <span>
              <strong>Composite scores as a single number.</strong> We tried
              it. Everyone asks &quot;which model is best?&quot; and a single
              number gives them an answer they feel confident about — and is
              wrong. The four dimensions (correctness, completeness, format,
              conciseness) stay separate in every published row.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-workshop-danger">—</span>
            <span>
              <strong>Speed-tests against vendor-cloud endpoints.</strong>{" "}
              Latency tests against hosted APIs measure the datacenter, not
              the model. We care about the chip.
            </span>
          </li>
        </ul>

        <h3 className="mt-6 font-heading text-lg font-semibold text-workshop-text">
          Socratic prompts — help us invent better benchmarks
        </h3>
        <p className="text-sm leading-relaxed text-workshop-muted">
          Open questions we&apos;d love contributions on. If you have a
          sharper answer, open a PR against the repo or drop it in the chat
          sidebar.
        </p>
        <ol className="space-y-3 list-decimal pl-5 text-sm text-workshop-text marker:text-workshop-primary">
          <li>
            What&apos;s the smallest prompt set that can reliably
            discriminate between a 7B and a 14B model on <em>memory
            extraction</em>? If 20 is enough, why are we running 200? If 200
            is needed, how would we prove it without measuring?
          </li>
          <li>
            How do we measure &quot;does this model know what it doesn&apos;t
            know&quot;? Every current rubric scores the output — none score
            the model&apos;s own confidence relative to ground truth.
            Calibration is a first-class property, not a footnote.
          </li>
          <li>
            Tokens-per-second is a straight line to a dollar. Quality-per-token
            is not. What&apos;s the function? Log? Sigmoid? A step at some
            parameter count? If we knew the shape, we&apos;d stop interpolating.
          </li>
          <li>
            Context window is a capacity, not a benchmark. Models degrade
            gracefully at different points. What&apos;s the sharpest test for
            &quot;needle in a haystack at 100k tokens&quot; that isn&apos;t
            gamed by positional priors?
          </li>
          <li>
            We quantize KV cache to q4 and have seen no composite hit. Is
            there a use case where q4 KV nukes accuracy? We suspect
            long-horizon chained reasoning, but we haven&apos;t found a clean
            minimal test.
          </li>
          <li>
            If a local 14B model scores within 5% of a hosted frontier on
            our rubrics, how much of the remaining 5% is actually rubric
            noise versus real capability gap? A delta smaller than your noise
            floor isn&apos;t a signal — it&apos;s a trap.
          </li>
          <li>
            What&apos;s the correct benchmark for <em>agentic</em> work? Most
            of what we actually want these models for is multi-step tool use,
            not single-turn completion. The rubric-scored single-prompt eval
            is the wrong test; we don&apos;t yet know the right one.
          </li>
          <li>
            Are the {""}
            <em>
              cheapest per token
            </em>{" "}
            numbers stable across GPU utilization? We measure mostly-idle
            GPUs. A production workload sharing a GPU with other tenants
            changes every number on the leaderboard.
          </li>
          <li>
            The H100 is 5× cheaper per token than an A100 here for the same
            model. Is that because the H100 is 5× better, or because the
            A100 instance we rented is throttled in ways we don&apos;t see?
            Distinguishing hardware from cloud-plumbing is hard.
          </li>
          <li>
            How do you benchmark a model that&apos;s still learning from your
            queries? A lot of modern serving layers adapt. Our rubric scores
            a moment in time; we don&apos;t yet capture drift.
          </li>
        </ol>

        <p className="mt-6 text-sm leading-relaxed text-workshop-muted">
          If any of these hook you, the repo is at{" "}
          <Link
            href="https://github.com/eidos-agi/live-eidosagi-com"
            className="text-workshop-primary hover:underline"
          >
            eidos-agi/live-eidosagi-com
          </Link>
          . The harness is in the sibling{" "}
          <code className="text-workshop-command">
            eidos-server-llm-testing-01
          </code>{" "}
          project. Evidence-graded findings from ongoing work live in{" "}
          <Link
            href="/research/why-local-matters"
            className="text-workshop-primary hover:underline"
          >
            /research/why-local-matters
          </Link>
          .
        </p>
      </section>
    </article>
  );
}
