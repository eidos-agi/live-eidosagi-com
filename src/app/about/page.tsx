import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why this site exists: a public, always-on benchmark from Eidos AGI.",
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-8 py-6">
      <header className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-workshop-primary">
          Manifesto
        </p>
        <h1 className="font-heading text-4xl font-bold text-workshop-text sm:text-5xl">
          Why this site exists
        </h1>
      </header>

      <div className="space-y-5 text-base leading-relaxed text-workshop-text">
        <p>
          We think the next decade of software will be built by agents, not
          applications. Agents that persist. Agents that remember. Agents that
          inhabit real machines, with real identities, doing real work on
          behalf of real people.
        </p>

        <p>
          To build that future, we need to know — not guess — how capable the
          models underneath are. Marketing numbers won&apos;t cut it. Private
          benchmarks kept on a Slack channel won&apos;t cut it. Anything hidden
          behind a login won&apos;t cut it. The only benchmark that earns trust
          is the one you can watch happen live, on hardware someone is paying
          for, against prompts written in the open.
        </p>

        <p>
          So we put three GPUs in a room and made them race. Same model. Same
          prompts. Same clock. Every token, every score, every dollar of GPU
          time, streamed to this page as it happens. When a run ends, the raw
          data stays — downloadable, checksum-auditable, never retroactively
          edited.
        </p>

        <p>
          Our thesis at Eidos AGI is that{" "}
          <span className="text-workshop-primary">memory is the moat</span>.
          Models are commoditizing into firmware; the long-term value lives in
          the substrate that remembers, searches, and reasons over everything
          an agent has ever seen. Silicon is the floor of that stack — the
          place where tokens per second and dollars per million tokens
          translate directly into what an agent can afford to think about.
          This site is the floor, made visible.
        </p>

        <p>
          And yes: the site itself is an artifact of the thesis. Every commit
          that ships it, every deploy that restarts it, every run that fills
          it, flows through the same activity stream you see on the homepage.
          The building of the thing is the thing. We call that{" "}
          <em>meta-meta</em> and we are entirely unapologetic about it.
        </p>

        <p>
          Read the code, file an issue, fork it, argue with us. Everything
          lives at{" "}
          <Link
            href="https://github.com/eidos-agi"
            className="text-workshop-primary underline-offset-4 hover:underline"
          >
            github.com/eidos-agi
          </Link>
          .
        </p>
      </div>

      <footer className="border-t border-workshop-muted/20 pt-6">
        <p className="font-mono text-sm text-workshop-muted">
          — Eidos AGI, 2026
        </p>
      </footer>
    </article>
  );
}
