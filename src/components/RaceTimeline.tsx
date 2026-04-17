// RaceTimeline — small multiples of tok/s over time, one line per GPU.
// Server component; renders an SVG sparkline directly from progress rows.

import { getDb } from "@/lib/db";

const WINDOW_HOURS = 2;
const W = 1000;
const H = 160;
const PAD_L = 50;
const PAD_R = 12;
const PAD_T = 16;
const PAD_B = 28;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

interface Sample {
  gpuId: string;
  ts: number;
  tok: number;
}

const GPU_COLORS: Record<string, string> = {
  "thunder-h100": "#b8c4a0",   // command green
  "thunder-a100": "#c4935a",   // amber brass
  "thunder-a6000": "#7a8c72",  // sage
};

const GPU_LABELS: Record<string, string> = {
  "thunder-h100": "H100",
  "thunder-a100": "A100",
  "thunder-a6000": "A6000",
};

function loadSamples(): Sample[] {
  try {
    const db = getDb();
    const since = Date.now() - WINDOW_HOURS * 60 * 60 * 1000;
    const rows = db
      .prepare(
        `SELECT gpu_id AS gpuId, ts, tok_per_sec AS tok
           FROM progress
          WHERE ts >= ? AND tok_per_sec IS NOT NULL AND tok_per_sec > 0
          ORDER BY ts ASC`,
      )
      .all(since) as Array<{ gpuId: string; ts: number; tok: number }>;
    return rows;
  } catch {
    return [];
  }
}

function niceMaxY(max: number): number {
  if (max <= 0) return 10;
  if (max <= 10) return 10;
  if (max <= 25) return 25;
  if (max <= 50) return 50;
  if (max <= 100) return 100;
  if (max <= 200) return 200;
  if (max <= 500) return 500;
  return Math.ceil(max / 100) * 100;
}

export default function RaceTimeline() {
  const samples = loadSamples();
  if (samples.length === 0) return null;

  const t0 = samples[0].ts;
  const t1 = samples[samples.length - 1].ts;
  const span = Math.max(1, t1 - t0);

  const byGpu = new Map<string, Sample[]>();
  for (const s of samples) {
    if (!byGpu.has(s.gpuId)) byGpu.set(s.gpuId, []);
    byGpu.get(s.gpuId)!.push(s);
  }
  const maxTok = samples.reduce((m, s) => Math.max(m, s.tok), 0);
  const maxY = niceMaxY(maxTok);

  function x(ts: number): number {
    return PAD_L + ((ts - t0) / span) * PLOT_W;
  }
  function y(tok: number): number {
    return PAD_T + PLOT_H - (tok / maxY) * PLOT_H;
  }

  // Horizontal grid lines (at 0, 50%, 100% of maxY)
  const gridYs = [0, maxY / 2, maxY];

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-workshop-muted">
          tok/s over the last {WINDOW_HOURS}h
        </h2>
        <div className="flex items-center gap-3 font-mono text-[10px] text-workshop-muted">
          {Array.from(byGpu.keys()).map((g) => (
            <span key={g} className="inline-flex items-center gap-1">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: GPU_COLORS[g] ?? "#8b8179" }}
              />
              {GPU_LABELS[g] ?? g}
            </span>
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded border border-workshop-muted/20 bg-workshop-surface/40">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-40 w-full"
          role="img"
          aria-label={`tok/s per GPU over the last ${WINDOW_HOURS} hours`}
        >
          {/* Grid */}
          {gridYs.map((g) => (
            <g key={g}>
              <line
                x1={PAD_L}
                x2={W - PAD_R}
                y1={y(g)}
                y2={y(g)}
                stroke="#8b8179"
                strokeOpacity="0.25"
                strokeDasharray="2 4"
              />
              <text
                x={PAD_L - 8}
                y={y(g) + 3}
                textAnchor="end"
                fontFamily="Monaco, Menlo, monospace"
                fontSize="10"
                fill="#8b8179"
              >
                {g === 0 ? "0" : g.toFixed(0)}
              </text>
            </g>
          ))}
          {/* y-axis label */}
          <text
            x={6}
            y={PAD_T - 2}
            fontFamily="Monaco, Menlo, monospace"
            fontSize="9"
            fill="#8b8179"
            style={{ textTransform: "uppercase", letterSpacing: "1px" }}
          >
            tok/s
          </text>

          {/* Time tick labels (left + right) */}
          <text
            x={PAD_L}
            y={H - 10}
            fontFamily="Monaco, Menlo, monospace"
            fontSize="9"
            fill="#8b8179"
          >
            {new Date(t0).toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            })}
          </text>
          <text
            x={W - PAD_R}
            y={H - 10}
            textAnchor="end"
            fontFamily="Monaco, Menlo, monospace"
            fontSize="9"
            fill="#8b8179"
          >
            now
          </text>

          {/* Lines */}
          {Array.from(byGpu.entries()).map(([gpuId, pts]) => {
            const color = GPU_COLORS[gpuId] ?? "#dcd5cb";
            const d = pts
              .map(
                (p, i) =>
                  `${i === 0 ? "M" : "L"} ${x(p.ts).toFixed(1)} ${y(p.tok).toFixed(1)}`,
              )
              .join(" ");
            return (
              <g key={gpuId}>
                <path
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* last-point dot */}
                {pts.length > 0 && (
                  <circle
                    cx={x(pts[pts.length - 1].ts)}
                    cy={y(pts[pts.length - 1].tok)}
                    r="4"
                    fill={color}
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
