// MissionRoadmap — a curving SVG path showing where Eidos is on the
// self-cheapening journey. Milestones are dots along a smooth cubic
// bezier; the current position dot is interpolated by local_share and
// gently pulses.
//
// Server component: reads local_share from SQLite, renders static-ish
// SVG. Auto-refreshes on router.refresh tick.

import { loadDashboardStats } from "@/lib/dashboard";

interface Milestone {
  t: number; // position 0..1 along the curve (== local_share threshold)
  label: string;
  caption: string;
}

const MILESTONES: Milestone[] = [
  { t: 0.0, label: "launch", caption: "0% local · event begins" },
  { t: 0.05, label: "first breath", caption: "a6000 narrator online" },
  { t: 0.5, label: "parity", caption: "local matches hosted" },
  { t: 0.7, label: "majority", caption: "local carries the feed" },
  { t: 0.9, label: "mission", caption: "90% local · event goal" },
  { t: 1.0, label: "autonomy", caption: "100% local · stretch" },
];

// Curve from (50, 170) to (950, 40) — gentle dip in the middle.
// We param-sample a cubic bezier. Start on the left, swing down, then up to the goal.
const P0 = { x: 50, y: 170 };
const P1 = { x: 330, y: 210 };
const P2 = { x: 670, y: 90 };
const P3 = { x: 950, y: 40 };

function bezier(t: number): { x: number; y: number } {
  const u = 1 - t;
  const x =
    u * u * u * P0.x + 3 * u * u * t * P1.x + 3 * u * t * t * P2.x + t * t * t * P3.x;
  const y =
    u * u * u * P0.y + 3 * u * u * t * P1.y + 3 * u * t * t * P2.y + t * t * t * P3.y;
  return { x, y };
}

export default function MissionRoadmap() {
  let share = 0;
  try {
    share = loadDashboardStats().savings.local_share;
  } catch {
    // fall through
  }
  // Clamp
  share = Math.max(0, Math.min(1, share));
  const here = bezier(share);
  const pct = Math.round(share * 100);

  // Which milestone's band are we in? Used to color the arc behind the marker.
  const passedMilestones = MILESTONES.filter((m) => m.t <= share).length;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-workshop-muted">
          mission roadmap
        </h2>
        <span className="font-mono text-[10px] text-workshop-muted">
          {passedMilestones}/{MILESTONES.length} milestones crossed
        </span>
      </div>
      <div className="overflow-hidden rounded border border-workshop-muted/20 bg-workshop-surface/40">
        <svg
          viewBox="0 0 1000 220"
          className="h-40 w-full"
          role="img"
          aria-label={`Mission roadmap: ${pct}% local authorship`}
        >
          {/* Baseline (the full curve, dim) */}
          <path
            d={`M ${P0.x} ${P0.y} C ${P1.x} ${P1.y}, ${P2.x} ${P2.y}, ${P3.x} ${P3.y}`}
            fill="none"
            stroke="#8b8179"
            strokeWidth="2"
            strokeOpacity="0.35"
            strokeDasharray="4 6"
            strokeLinecap="round"
          />

          {/* Traveled portion — solid amber, ends at the 'here' point.
              Drawn by sampling the curve from t=0 to t=share as a polyline. */}
          {share > 0 && (
            <polyline
              points={Array.from({ length: 40 }, (_, i) =>
                bezier((i / 39) * share),
              )
                .map((p) => `${p.x},${p.y}`)
                .join(" ")}
              fill="none"
              stroke="#c4935a"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          )}

          {/* Milestones */}
          {MILESTONES.map((m) => {
            const p = bezier(m.t);
            const passed = share >= m.t;
            const fill = passed ? "#c4935a" : "#1e1a17";
            const stroke = passed ? "#c4935a" : "#8b8179";
            const labelColor = passed ? "#dcd5cb" : "#8b8179";
            return (
              <g key={m.t}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="6"
                  fill={fill}
                  stroke={stroke}
                  strokeWidth="2"
                />
                <text
                  x={p.x}
                  y={p.y - 14}
                  textAnchor="middle"
                  fontFamily="Monaco, Menlo, monospace"
                  fontSize="10"
                  letterSpacing="1"
                  fill={labelColor}
                  style={{ textTransform: "uppercase" }}
                >
                  {m.label}
                </text>
                <text
                  x={p.x}
                  y={p.y + 20}
                  textAnchor="middle"
                  fontFamily="Monaco, Menlo, monospace"
                  fontSize="9"
                  fill="#8b8179"
                >
                  {Math.round(m.t * 100)}%
                </text>
              </g>
            );
          })}

          {/* You are here — pulsing dot */}
          <g>
            <circle
              cx={here.x}
              cy={here.y}
              r="11"
              fill="#c4935a"
              opacity="0.35"
            >
              <animate
                attributeName="r"
                values="9;16;9"
                dur="1.6s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.45;0.05;0.45"
                dur="1.6s"
                repeatCount="indefinite"
              />
            </circle>
            <circle
              cx={here.x}
              cy={here.y}
              r="6"
              fill="#dcd5cb"
              stroke="#c4935a"
              strokeWidth="2"
            />
            {/* "here" label — floats above the marker */}
            <text
              x={here.x}
              y={here.y - 22}
              textAnchor="middle"
              fontFamily="Monaco, Menlo, monospace"
              fontSize="10"
              letterSpacing="1"
              fill="#dcd5cb"
              style={{ textTransform: "uppercase" }}
            >
              here · {pct}%
            </text>
          </g>
        </svg>
      </div>
      <div className="flex flex-wrap justify-between gap-2 font-mono text-[10px] text-workshop-muted">
        {MILESTONES.map((m) => {
          const passed = share >= m.t;
          return (
            <span
              key={m.t}
              className={passed ? "text-workshop-primary" : ""}
              title={m.caption}
            >
              {m.label} · {Math.round(m.t * 100)}%
            </span>
          );
        })}
      </div>
    </div>
  );
}
