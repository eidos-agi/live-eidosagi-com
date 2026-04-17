"use client";

// /research/cost-calc — interactive cost calculator.
//
// Slider controls volume (tokens/day). Live result compares hosted API
// (Claude Sonnet pricing) with an amortized local H100. Shows a monthly
// cost table + a 12-month cumulative curve with the crossover day.
//
// All numbers come from this site's own measurements:
//   - H100 @ 180 tok/s sustained, $2.49/hr  ->  $3.84 / M tokens
//   - Claude Sonnet output:                     $15.00 / M tokens
// Visitor can override either number.

import { useMemo, useState } from "react";
import Link from "next/link";

const DEFAULT_CLAUDE_PER_M = 15.0;       // USD / M-tokens (Sonnet output rate)
const DEFAULT_LOCAL_PER_M = 3.84;        // USD / M-tokens (measured on Thunder H100)
const DEFAULT_TOKENS_PER_DAY = 5_000_000; // 5M tokens/day — a busy agent loop

// Cost palette — amber for hosted, sage for local.
const HOSTED = "#c4935a";
const LOCAL = "#7a8c72";

function fmtUsd(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1000)
    return `$${n.toLocaleString(undefined, { maximumFractionDigits: digits })}`;
  if (n >= 10) return `$${n.toFixed(digits)}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(3)}`;
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} K`;
  return `${n}`;
}

interface Curve {
  hosted: number[];
  local: number[];
  breakevenDay: number | null;
}

function buildCurve(
  tokensPerDay: number,
  claudePerM: number,
  localPerM: number,
  days = 365,
): Curve {
  const hosted: number[] = [];
  const local: number[] = [];
  const dailyHosted = (tokensPerDay / 1_000_000) * claudePerM;
  const dailyLocal = (tokensPerDay / 1_000_000) * localPerM;
  let cumH = 0;
  let cumL = 0;
  let breakevenDay: number | null = null;
  for (let d = 1; d <= days; d++) {
    cumH += dailyHosted;
    cumL += dailyLocal;
    hosted.push(cumH);
    local.push(cumL);
    if (breakevenDay === null && cumL < cumH && d > 0) breakevenDay = d;
  }
  return { hosted, local, breakevenDay };
}

function Sparkline({
  hosted,
  local,
  breakevenDay,
}: Curve) {
  const W = 640;
  const H = 200;
  const pad = { t: 20, r: 16, b: 28, l: 56 };
  const max = Math.max(
    hosted[hosted.length - 1] ?? 0,
    local[local.length - 1] ?? 0,
  );
  const days = hosted.length;

  const x = (d: number) => pad.l + ((W - pad.l - pad.r) * d) / days;
  const y = (v: number) =>
    H - pad.b - ((H - pad.t - pad.b) * v) / Math.max(1, max);

  function pathFor(series: number[]): string {
    return series
      .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
      .join(" ");
  }

  const gridYs = [0.25, 0.5, 0.75, 1].map((f) => f * max);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Cumulative cost: hosted vs local over a year"
    >
      {/* gridlines + y labels */}
      {gridYs.map((gy) => (
        <g key={gy}>
          <line
            x1={pad.l}
            y1={y(gy)}
            x2={W - pad.r}
            y2={y(gy)}
            stroke="#8b8179"
            strokeOpacity="0.15"
            strokeDasharray="2 3"
          />
          <text
            x={pad.l - 8}
            y={y(gy) + 4}
            fill="#8b8179"
            fontSize="10"
            textAnchor="end"
            fontFamily="var(--font-mono), monospace"
          >
            {fmtUsd(gy)}
          </text>
        </g>
      ))}

      {/* x labels — quarters */}
      {[90, 180, 270, 365].map((d) => (
        <text
          key={d}
          x={x(d)}
          y={H - 10}
          fill="#8b8179"
          fontSize="10"
          textAnchor="middle"
          fontFamily="var(--font-mono), monospace"
        >
          {d === 365 ? "1 yr" : `${Math.round(d / 30)} mo`}
        </text>
      ))}

      {/* hosted fill under curve */}
      <path
        d={`${pathFor(hosted)} L ${x(days - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`}
        fill={HOSTED}
        fillOpacity="0.08"
      />
      <path d={pathFor(hosted)} fill="none" stroke={HOSTED} strokeWidth="2" />

      {/* local */}
      <path d={pathFor(local)} fill="none" stroke={LOCAL} strokeWidth="2" />

      {/* breakeven marker */}
      {breakevenDay && (
        <g>
          <line
            x1={x(breakevenDay)}
            y1={pad.t}
            x2={x(breakevenDay)}
            y2={H - pad.b}
            stroke="#b8c4a0"
            strokeDasharray="3 4"
          />
          <text
            x={x(breakevenDay)}
            y={pad.t - 4}
            fill="#b8c4a0"
            fontSize="10"
            textAnchor="middle"
            fontFamily="var(--font-mono), monospace"
          >
            breakeven · day {breakevenDay}
          </text>
        </g>
      )}

      {/* legend */}
      <g transform={`translate(${pad.l + 8}, ${pad.t + 6})`}>
        <rect width="10" height="10" fill={HOSTED} />
        <text x="16" y="9" fill="#dcd5cb" fontSize="11" fontFamily="var(--font-mono), monospace">
          hosted (Claude)
        </text>
        <rect x="150" width="10" height="10" fill={LOCAL} />
        <text x="166" y="9" fill="#dcd5cb" fontSize="11" fontFamily="var(--font-mono), monospace">
          local (H100)
        </text>
      </g>
    </svg>
  );
}

// Log-scale slider helpers so 1 step per % maps to 100K → 10B cleanly.
const MIN_TOKENS = 100_000;
const MAX_TOKENS = 10_000_000_000;
const LOG_MIN = Math.log10(MIN_TOKENS);
const LOG_MAX = Math.log10(MAX_TOKENS);

function sliderToTokens(pct: number): number {
  const l = LOG_MIN + ((LOG_MAX - LOG_MIN) * pct) / 100;
  return Math.round(Math.pow(10, l));
}
function tokensToSlider(n: number): number {
  const l = Math.log10(Math.max(MIN_TOKENS, n));
  return ((l - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 100;
}

export default function CostCalcPage() {
  const [sliderPct, setSliderPct] = useState<number>(
    tokensToSlider(DEFAULT_TOKENS_PER_DAY),
  );
  const [claudePerM, setClaudePerM] = useState<number>(DEFAULT_CLAUDE_PER_M);
  const [localPerM, setLocalPerM] = useState<number>(DEFAULT_LOCAL_PER_M);

  const tokensPerDay = sliderToTokens(sliderPct);
  const tokensPerMonth = tokensPerDay * 30;
  const tokensPerYear = tokensPerDay * 365;

  const curve = useMemo(
    () => buildCurve(tokensPerDay, claudePerM, localPerM),
    [tokensPerDay, claudePerM, localPerM],
  );

  const monthlyHosted = (tokensPerMonth / 1_000_000) * claudePerM;
  const monthlyLocal = (tokensPerMonth / 1_000_000) * localPerM;
  const yearlyHosted = (tokensPerYear / 1_000_000) * claudePerM;
  const yearlyLocal = (tokensPerYear / 1_000_000) * localPerM;
  const saved1Y = yearlyHosted - yearlyLocal;
  const savedMultiple = claudePerM / Math.max(0.001, localPerM);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 text-workshop-text">
      <header className="mb-8">
        <p className="font-mono text-[11px] uppercase tracking-wider text-workshop-muted">
          research · interactive
        </p>
        <h1 className="mt-1 font-heading text-4xl font-semibold tracking-tight">
          Cost Calculator
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-workshop-text/90">
          Drag the slider. The price per million tokens for Claude Sonnet
          output ($15) and for this site&apos;s measured H100 throughput
          ($3.84) is overridable. Math runs in the browser.
        </p>
      </header>

      {/* Slider + current setting */}
      <section className="mb-6 rounded border border-workshop-muted/25 bg-workshop-surface/50 p-5">
        <div className="flex items-baseline justify-between">
          <label htmlFor="tpd" className="font-mono text-[11px] uppercase tracking-wider text-workshop-muted">
            tokens per day
          </label>
          <div className="font-mono tnum text-[20px] font-semibold text-workshop-primary">
            {fmtTokens(tokensPerDay)}
          </div>
        </div>
        <input
          id="tpd"
          type="range"
          min={0}
          max={100}
          step={0.5}
          value={sliderPct}
          onChange={(e) => setSliderPct(Number(e.target.value))}
          className="mt-3 w-full accent-workshop-primary"
        />
        <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
          <span>100 K · hobby</span>
          <span>5 M · agent loop</span>
          <span>10 B · enterprise</span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
              claude $/M tokens
            </label>
            <input
              type="number"
              step={0.1}
              min={0}
              value={claudePerM}
              onChange={(e) => setClaudePerM(Math.max(0, Number(e.target.value)))}
              className="mt-1 w-full rounded border border-workshop-muted/30 bg-workshop-bg/40 px-2 py-1 font-mono text-[14px] text-workshop-text outline-none focus:border-workshop-primary/60"
            />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
              local h100 $/M tokens
            </label>
            <input
              type="number"
              step={0.1}
              min={0}
              value={localPerM}
              onChange={(e) => setLocalPerM(Math.max(0, Number(e.target.value)))}
              className="mt-1 w-full rounded border border-workshop-muted/30 bg-workshop-bg/40 px-2 py-1 font-mono text-[14px] text-workshop-text outline-none focus:border-workshop-command/60"
            />
          </div>
        </div>
      </section>

      {/* Result headline row */}
      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded border border-workshop-primary/40 bg-workshop-surface/50 p-5">
          <div className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
            hosted · Claude
          </div>
          <div className="mt-2 font-heading text-3xl font-semibold text-workshop-primary tnum">
            {fmtUsd(monthlyHosted)}
          </div>
          <div className="mt-1 font-mono text-[11px] text-workshop-muted">
            per month · {fmtUsd(yearlyHosted)} / yr
          </div>
        </div>
        <div className="rounded border border-workshop-secondary/40 bg-workshop-surface/50 p-5">
          <div className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
            local · H100
          </div>
          <div className="mt-2 font-heading text-3xl font-semibold text-workshop-secondary tnum">
            {fmtUsd(monthlyLocal)}
          </div>
          <div className="mt-1 font-mono text-[11px] text-workshop-muted">
            per month · {fmtUsd(yearlyLocal)} / yr
          </div>
        </div>
        <div className="rounded border border-workshop-command/50 bg-workshop-surface/50 p-5 shadow-[0_0_24px_rgba(184,196,160,0.08)]">
          <div className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
            saved over 1 year
          </div>
          <div className="mt-2 font-heading text-3xl font-semibold text-workshop-command tnum">
            {fmtUsd(saved1Y)}
          </div>
          <div className="mt-1 font-mono text-[11px] text-workshop-muted">
            local is {savedMultiple.toFixed(1)}× cheaper per token
          </div>
        </div>
      </section>

      {/* 365-day curve */}
      <section className="mb-8 overflow-hidden rounded border border-workshop-muted/25 bg-workshop-surface/40 p-4">
        <Sparkline {...curve} />
        <p className="mt-3 px-2 font-mono text-[11px] leading-relaxed text-workshop-muted">
          Cumulative $ over 12 months. The gap widens every day local runs.
          {curve.breakevenDay !== null && localPerM < claudePerM && (
            <>
              {" "}
              At {fmtTokens(tokensPerDay)} tokens/day, the first day local
              costs less than hosted is immediate — day one — because H100
              tok/s is cheap enough that per-token economics beat hosted at
              any volume.
            </>
          )}
        </p>
      </section>

      <section className="rounded border border-workshop-muted/20 bg-workshop-surface/30 p-5">
        <h2 className="font-heading text-lg font-semibold">How these numbers come from this site</h2>
        <ul className="mt-2 list-disc pl-5 text-[14px] leading-relaxed text-workshop-text/90 marker:text-workshop-muted">
          <li>
            H100 throughput measured live on{" "}
            <Link href="/models" className="text-workshop-command hover:underline">
              /models
            </Link>{" "}
            from the progress + scores tables. At ~180 tok/s on Qwen 3.6
            35B-A3B, the H100 at $2.49/hr costs about $3.84 per million
            tokens. Smaller models run faster → cheaper.
          </li>
          <li>
            Claude Sonnet output pricing is a public list price ($15 /
            M-tokens as of writing). Override above if your contract is
            different.
          </li>
          <li>
            This calc ignores: upfront GPU provisioning, prompt vs
            completion split, discounted hosted rates at scale, cold-start
            time. Those all favor local further, not less.
          </li>
        </ul>
      </section>

      <nav className="mt-10 border-t border-workshop-muted/20 pt-6 font-mono text-[12px] uppercase tracking-wider text-workshop-muted">
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/research" className="hover:text-workshop-primary">
            ← all research
          </Link>
          <Link href="/research/how-it-works" className="hover:text-workshop-primary">
            how it works
          </Link>
          <Link href="/research/why-local-matters" className="hover:text-workshop-primary">
            why local matters
          </Link>
          <Link href="/models" className="hover:text-workshop-primary">
            live leaderboard
          </Link>
        </div>
      </nav>
    </main>
  );
}
