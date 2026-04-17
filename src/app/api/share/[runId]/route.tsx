import { ImageResponse } from "next/og";
import { loadShareData } from "@/lib/share-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Workshop palette, inlined for the OG image.
const C = {
  bg: "#161210",
  surface: "#1e1a17",
  text: "#dcd5cb",
  muted: "#8b8179",
  primary: "#c4935a",
  secondary: "#7a8c72",
  command: "#b8c4a0",
};

const LANE: Record<string, string> = {
  A6000: C.command,
  A100: C.primary,
  H100: C.secondary,
};

/**
 * 1200x630 PNG share card for a completed run.
 *   - podium (three lanes ranked)
 *   - headline tok/s + $/1M-tok + model name + date
 *   - workshop palette
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> },
): Promise<Response> {
  const { runId } = await params;
  const data = await loadShareData(runId);
  if (!data) return new Response("not found", { status: 404 });

  const { run, podium, headlineTps, headlineGpu, model } = data;
  const winner = podium[0] ?? null;
  const date = new Date(run.startedAt).toISOString().slice(0, 10);
  const dollarsPerMillion = winner?.dollarsPerMillionTokens ?? null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          background: C.bg,
          color: C.text,
          fontFamily: "system-ui, sans-serif",
          padding: "56px 64px",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{
                fontSize: 18,
                letterSpacing: 6,
                color: C.muted,
                textTransform: "uppercase",
              }}
            >
              live.eidosagi.com
            </div>
            <div style={{ fontSize: 30, color: C.primary, fontWeight: 700 }}>
              Three-Lane GPU Race
            </div>
          </div>
          <div style={{ fontSize: 20, color: C.muted, fontFamily: "monospace" }}>
            {date} · {run.id.slice(0, 10)}
          </div>
        </div>

        <div
          style={{
            marginTop: 36,
            display: "flex",
            alignItems: "flex-end",
            gap: 24,
          }}
        >
          <div
            style={{
              fontSize: 170,
              fontWeight: 800,
              lineHeight: 1,
              color: C.primary,
              fontFamily: "monospace",
            }}
          >
            {headlineTps != null ? headlineTps.toFixed(0) : "—"}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              paddingBottom: 16,
            }}
          >
            <div style={{ fontSize: 28, color: C.text, fontWeight: 700 }}>
              tok / sec
            </div>
            <div style={{ fontSize: 20, color: C.muted }}>
              {headlineGpu ?? "—"}
              {model ? ` · ${model}` : ""}
            </div>
            {dollarsPerMillion != null && (
              <div
                style={{
                  fontSize: 20,
                  color: C.command,
                  fontFamily: "monospace",
                }}
              >
                ${dollarsPerMillion.toFixed(2)} / 1M tok
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            marginTop: 48,
            display: "flex",
            gap: 24,
            flex: 1,
          }}
        >
          {podium.slice(0, 3).map((entry, i) => {
            const color = LANE[entry.type] ?? C.muted;
            const place = ["1st", "2nd", "3rd"][i] ?? `${i + 1}th`;
            return (
              <div
                key={entry.gpuId}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  background: C.surface,
                  border: `1px solid ${i === 0 ? color : C.muted + "33"}`,
                  padding: "24px 24px",
                  gap: 12,
                  borderRadius: 4,
                  boxShadow:
                    i === 0
                      ? `0 0 0 1px ${color}55, 0 0 40px ${color}22`
                      : "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <div style={{ fontSize: 32, fontWeight: 700, color }}>
                    {entry.type}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: C.muted,
                      letterSpacing: 3,
                      textTransform: "uppercase",
                    }}
                  >
                    {place}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div
                    style={{
                      fontSize: 13,
                      color: C.muted,
                      textTransform: "uppercase",
                      letterSpacing: 2,
                    }}
                  >
                    peak tok/s
                  </div>
                  <div
                    style={{
                      fontSize: 40,
                      color: C.text,
                      fontFamily: "monospace",
                      fontWeight: 700,
                    }}
                  >
                    {entry.maxTps.toFixed(1)}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div
                    style={{
                      fontSize: 13,
                      color: C.muted,
                      textTransform: "uppercase",
                      letterSpacing: 2,
                    }}
                  >
                    $ / 1M tok
                  </div>
                  <div
                    style={{
                      fontSize: 24,
                      color: C.command,
                      fontFamily: "monospace",
                    }}
                  >
                    {entry.dollarsPerMillionTokens != null
                      ? `$${entry.dollarsPerMillionTokens.toFixed(2)}`
                      : "—"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 32,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 18, color: C.muted }}>
            We put models in the fire.
          </div>
          <div
            style={{
              fontSize: 14,
              color: C.muted,
              fontFamily: "monospace",
            }}
          >
            eidosagi.com
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
