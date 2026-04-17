import Link from "next/link";

export const metadata = {
  title: "Research · live.eidosagi.com",
  description:
    "Decisions earned with evidence — why local matters, how Eidos is migrating off Anthropic, and a log written by the local model itself.",
};

// ISR — index content is hand-edited, refresh every 5 min.
export const revalidate = 300;

type Entry = {
  href: string;
  title: string;
  blurb: string;
  authorLabel: string;
  authorDetail: string;
  tone: "primary" | "danger" | "command";
};

const ENTRIES: Entry[] = [
  {
    href: "/research/why-local-matters",
    title: "Why Local Matters",
    blurb:
      "The thesis: frontier API bills compound, but local silicon amortizes. A dollar of H100 time buys more useful tokens than a dollar of Claude time, once the workload is honest.",
    authorLabel: "claude",
    authorDetail: "authored by Claude (Anthropic-hosted) during the live build",
    tone: "primary",
  },
  {
    href: "/research/migration-plan",
    title: "Migration Plan · ADR-005",
    blurb:
      "How the agent harness is moving itself off Anthropic onto local silicon, step by step. The last paragraph of the progress log is the first prose on this site authored by eidos-local.",
    authorLabel: "claude + eidos-local",
    authorDetail:
      "scaffold by Claude; progress log paragraph authored by Qwen 3.6 35B-A3B (MoE, ~3 B active) on an H100 via the qwen-harness emit_paragraph tool",
    tone: "danger",
  },
  {
    href: "/research/eidos-local-log",
    title: "Eidos · Local Log",
    blurb:
      "A page authored end-to-end by the local model — prose, file write, build verification. Not edited by Claude. Not edited by a human. The harness shipped it.",
    authorLabel: "eidos-local",
    authorDetail:
      "authored by Qwen 3.6 35B-A3B (sparse mixture-of-experts, ~3 B active params per token, released 2026-04-16) running on a single NVIDIA H100 80 GB via Ollama 0.21.0 over SSH. The qwen-harness script (scripts/qwen-harness.py) gave it four tools — write_file, run_command, log_event, done — and it used them to create src/app/research/eidos-local-log/page.tsx, run `pnpm build` (exit 0, 15.4 s), and declare itself finished. Four turns, ~25 s wall-clock, Anthropic untouched.",
    tone: "command",
  },
];

function toneClass(t: Entry["tone"]): string {
  switch (t) {
    case "primary":
      return "border-workshop-primary/40 text-workshop-primary";
    case "danger":
      return "border-workshop-danger/50 text-workshop-danger";
    case "command":
      return "border-workshop-command/50 text-workshop-command";
  }
}

export default function ResearchIndex() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-workshop-text">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        Research
      </h1>
      <p className="mt-3 font-mono text-xs uppercase tracking-wider text-workshop-muted">
        decisions earned with evidence · authorship labeled per page
      </p>
      <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-workshop-text/90">
        Three entries, in the order they were written. Each is tagged with the
        exact agent that authored it — the further you scroll, the less
        Anthropic is in the critical path.
      </p>

      <ul className="mt-10 space-y-6">
        {ENTRIES.map((e) => (
          <li
            key={e.href}
            className={`rounded border bg-workshop-surface/50 p-5 transition hover:bg-workshop-surface ${toneClass(
              e.tone,
            )}`}
          >
            <Link href={e.href} className="block">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-heading text-xl font-semibold text-workshop-text">
                  {e.title}
                </h2>
                <span
                  className={`font-mono text-[10px] uppercase tracking-wider ${toneClass(
                    e.tone,
                  )}`}
                >
                  {e.authorLabel}
                </span>
              </div>
              <p className="mt-2 text-[14px] leading-relaxed text-workshop-text/90">
                {e.blurb}
              </p>
              <p className="mt-3 font-mono text-[11px] leading-relaxed text-workshop-muted">
                {e.authorDetail}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
