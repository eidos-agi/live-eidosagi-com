"use client";

import { useEffect, useState } from "react";
import type { ProgressEvent, Run } from "@/lib/types";
import HeroLoop from "./HeroLoop";

interface Props {
  liveRun: Run | null;
  /** Last completed run — used for fallback headline if no live run. */
  lastRun: Run | null;
  /** Last event for the lastRun's winner, for fallback headline number. */
  lastRunHeadline: {
    tokPerSec: number;
    gpu: string;
    endedAt: string;
  } | null;
}

function relativeMinutes(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return "just now";
  const m = Math.round(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  return `${d} d ago`;
}

/**
 * Above-the-fold hero. Giant tagline + one-line context + live tok/s
 * for the currently-leading GPU (if a run is live). Falls back to the
 * last completed run's headline number.
 *
 * Height capped at 100vh via min-h + maxHeight 100vh — actual content
 * is centered so the race board below shows on scroll.
 */
export default function Hero({ liveRun, lastRun, lastRunHeadline }: Props) {
  const runId = liveRun?.id ?? null;
  const [leader, setLeader] = useState<{
    tps: number;
    gpuId: string;
    model: string;
  } | null>(null);
  const [pulse, setPulse] = useState(0);

  // Subscribe to live run if one exists. Independent of RaceBoard's
  // hook — both can read the same SSE stream concurrently.
  useEffect(() => {
    if (!runId) {
      setLeader(null);
      return;
    }
    let cancelled = false;

    // Seed with snapshot so the headline number appears on first paint.
    fetch(`/api/runs/${encodeURIComponent(runId)}/events`)
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((data: { events?: ProgressEvent[] }) => {
        if (cancelled) return;
        const events = data.events ?? [];
        const latestByGpu = new Map<string, ProgressEvent>();
        for (const ev of events) latestByGpu.set(ev.gpuId, ev);
        let best: ProgressEvent | null = null;
        for (const ev of latestByGpu.values()) {
          if (!best || ev.tokenPerSec > best.tokenPerSec) best = ev;
        }
        if (best) {
          setLeader({
            tps: best.tokenPerSec,
            gpuId: best.gpuId,
            model: best.model,
          });
        }
      })
      .catch(() => {
        /* empty state handled below */
      });

    const es = new EventSource(
      `/api/runs/${encodeURIComponent(runId)}/stream`,
    );
    const latestByGpu = new Map<string, ProgressEvent>();
    es.onmessage = (msg) => {
      try {
        const ev = JSON.parse(msg.data) as ProgressEvent;
        if (typeof ev.tokenPerSec !== "number") return;
        latestByGpu.set(ev.gpuId, ev);
        let best: ProgressEvent | null = null;
        for (const e of latestByGpu.values()) {
          if (!best || e.tokenPerSec > best.tokenPerSec) best = e;
        }
        if (best) {
          setLeader({
            tps: best.tokenPerSec,
            gpuId: best.gpuId,
            model: best.model,
          });
          setPulse((p) => p + 1);
        }
      } catch {
        /* ignore */
      }
    };
    return () => {
      cancelled = true;
      es.close();
    };
  }, [runId]);

  const isLive = Boolean(liveRun && leader);

  const headlineNumber = isLive
    ? leader!.tps
    : lastRunHeadline?.tokPerSec ?? null;

  const subline = isLive
    ? `${leader!.gpuId} · ${leader!.model} · leading`
    : lastRun && lastRunHeadline
      ? `last run · ${relativeMinutes(lastRunHeadline.endedAt)} · ${lastRunHeadline.gpu}`
      : "awaiting first ignition";

  return (
    <section
      className="relative flex min-h-[calc(100vh-140px)] flex-col justify-center overflow-hidden"
      style={{ maxHeight: "100vh" }}
    >
      <HeroLoop />

      <div className="relative z-10 space-y-6 py-10">
        <h1 className="font-heading text-5xl font-bold leading-[1.05] tracking-tight text-workshop-text md:text-7xl lg:text-8xl">
          We put models in the fire.
        </h1>
        <p className="max-w-2xl text-lg text-workshop-muted md:text-xl">
          Three GPUs race the same language model in real time.
        </p>

        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 pt-4">
          <div
            key={pulse}
            className={`tnum font-mono text-6xl font-bold md:text-7xl lg:text-8xl ${
              isLive ? "hero-pulse text-workshop-primary" : "text-workshop-text"
            }`}
            style={{ fontVariantNumeric: "tabular-nums slashed-zero" }}
          >
            {headlineNumber != null ? headlineNumber.toFixed(1) : "—"}
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-mono text-xs uppercase tracking-wider text-workshop-muted">
              tok / sec
            </span>
            <span className="font-mono text-xs uppercase tracking-wider text-workshop-muted">
              {subline}
            </span>
          </div>
        </div>
      </div>

      <div className="relative z-10 pt-10 font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
        ↓ scroll for the race board
      </div>

      <style>{`
        .hero-pulse {
          animation: hero-glow 900ms ease-out;
          text-shadow: 0 0 24px color-mix(in srgb, #c4935a 55%, transparent);
        }
        @keyframes hero-glow {
          0%   { text-shadow: 0 0 0 transparent; }
          30%  { text-shadow: 0 0 36px color-mix(in srgb, #c4935a 80%, transparent); }
          100% { text-shadow: 0 0 24px color-mix(in srgb, #c4935a 55%, transparent); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-pulse {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}
