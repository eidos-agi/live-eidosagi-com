import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ShareRunButton from "@/components/ShareRunButton";
import { buildNarrative } from "@/lib/narrative";
import { readEvents, readRunMeta, readScores } from "@/lib/store";

export const dynamic = "force-dynamic";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://live.eidosagi.com";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const run = await readRunMeta(id);
  if (!run) return { title: "Run not found" };
  const events = await readEvents(id);
  const scores = await readScores(id);
  const narrative = buildNarrative(run, events, scores);

  const cardUrl = `${SITE_URL}/api/share/${encodeURIComponent(id)}`;
  const pageUrl = `${SITE_URL}/runs/${encodeURIComponent(id)}/narrative`;

  return {
    title: `${narrative.title} — Eidos Live`,
    description: narrative.prose.slice(0, 200),
    openGraph: {
      title: narrative.title,
      description: narrative.prose.slice(0, 200),
      url: pageUrl,
      images: [{ url: cardUrl, width: 1200, height: 630 }],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: narrative.title,
      description: narrative.prose.slice(0, 200),
      images: [cardUrl],
    },
  };
}

const LANE_COLOR: Record<string, string> = {
  A6000: "#b8c4a0",
  A100: "#c4935a",
  H100: "#7a8c72",
};

export default async function RunNarrativePage({ params }: PageProps) {
  const { id } = await params;
  const run = await readRunMeta(id);
  if (!run) notFound();
  const [events, scores] = await Promise.all([
    readEvents(id),
    readScores(id),
  ]);
  const narrative = buildNarrative(run, events, scores);

  const pageUrl = `${SITE_URL}/runs/${encodeURIComponent(id)}/narrative`;

  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <Link
          href={`/runs/${encodeURIComponent(id)}`}
          className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted hover:text-workshop-primary"
        >
          ← charts + scores
        </Link>
        <h1 className="font-heading text-3xl font-bold text-workshop-text md:text-4xl">
          {narrative.title}
        </h1>
        <div className="font-mono text-xs text-workshop-muted">
          {new Date(run.startedAt).toISOString()} →{" "}
          {run.endedAt ? new Date(run.endedAt).toISOString() : "live"}
        </div>
        <ShareRunButton
          runId={id}
          runUrl={pageUrl}
          tweetText={`${narrative.headline.model} race: ${
            narrative.headline.winner?.type ?? "—"
          } wins at ${narrative.headline.winner?.maxTps.toFixed(0) ?? "—"} tok/s`}
        />
      </header>

      <section className="rounded border border-workshop-muted/20 bg-workshop-surface p-6">
        <p className="text-lg leading-relaxed text-workshop-text">
          {narrative.prose}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-workshop-text">
          Podium
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {narrative.podium.map((entry, i) => {
            const color = LANE_COLOR[entry.type] ?? "#8b8179";
            const place = ["1st", "2nd", "3rd"][i] ?? `${i + 1}th`;
            return (
              <div
                key={entry.gpuId}
                className={`rounded border border-workshop-muted/20 bg-workshop-surface p-5 ${
                  i === 0 ? "lane-leader" : ""
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <div
                    className="font-heading text-xl font-bold"
                    style={{ color }}
                  >
                    {entry.type}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
                    {place}
                  </div>
                </div>
                <div className="mt-1 font-mono text-xs text-workshop-muted">
                  {entry.gpuId}
                </div>
                <dl className="mt-4 space-y-2">
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
                      peak tok/s
                    </dt>
                    <dd className="font-mono text-2xl text-workshop-text tnum">
                      {entry.maxTps.toFixed(1)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
                      avg tok/s
                    </dt>
                    <dd className="font-mono text-workshop-text tnum">
                      {entry.avgTps.toFixed(1)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
                      $ / 1M tok
                    </dt>
                    <dd className="font-mono text-workshop-command tnum">
                      {entry.dollarsPerMillionTokens != null
                        ? `$${entry.dollarsPerMillionTokens.toFixed(2)}`
                        : "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>
      </section>
    </article>
  );
}
