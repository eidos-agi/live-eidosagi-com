import { readSchedule } from "@/lib/schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://live.eidosagi.com";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(): Promise<Response> {
  const schedule = await readSchedule();
  const items = schedule
    .slice()
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    .map((run) => {
      const title = `${run.label} — ${run.model}`;
      const desc = `GPUs: ${run.gpus.join(", ")}${run.prompt ? `. Workload: ${run.prompt}` : ""}`;
      const link = `${SITE_URL}/schedule#${encodeURIComponent(run.id)}`;
      const pubDate = new Date(run.startsAt).toUTCString();
      return `
    <item>
      <title>${escapeXml(title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="false">${escapeXml(run.id)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(desc)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Eidos Live — Schedule</title>
    <link>${SITE_URL}/schedule</link>
    <description>Upcoming GPU benchmark races on live.eidosagi.com</description>
    <language>en-us</language>${items}
  </channel>
</rss>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
