// Narrative helper — converts a completed run into human-readable prose.
// Feeds the /runs/[id]/narrative page and the per-run Open Graph metadata.

import { buildPodium, type PodiumEntry } from "./share-data";
import type { EvalScore, ProgressEvent, Run } from "./types";

export interface Narrative {
  title: string;
  /** 2–4 sentences, template-driven. */
  prose: string;
  podium: PodiumEntry[];
  headline: {
    date: string;
    model: string;
    winner: PodiumEntry | null;
    loser: PodiumEntry | null;
    winnerVsLoserX: number | null;
    winnerCostPerM: number | null;
    loserCostPerM: number | null;
  };
}

function formatX(x: number): string {
  if (!Number.isFinite(x)) return "0";
  if (x >= 10) return `${x.toFixed(0)}×`;
  return `${x.toFixed(1)}×`;
}

function surprise(winner: PodiumEntry, loser: PodiumEntry): string {
  if (!winner.dollarsPerMillionTokens || !loser.dollarsPerMillionTokens) {
    return `${winner.type} was the clear fastest — speed alone wins here.`;
  }
  const cheaper =
    winner.dollarsPerMillionTokens < loser.dollarsPerMillionTokens
      ? winner
      : loser;
  const pricier = cheaper === winner ? loser : winner;
  const ratio =
    pricier.dollarsPerMillionTokens! / cheaper.dollarsPerMillionTokens!;

  if (cheaper === winner) {
    return `the headline GPU ${winner.type} was also the cheapest per-million tokens, coming in ${ratio.toFixed(1)}× less than ${pricier.type}.`;
  }
  return `even though ${winner.type} was fastest, ${cheaper.type} delivered the cheapest tokens at $${cheaper.dollarsPerMillionTokens!.toFixed(2)}/M — ${ratio.toFixed(1)}× less than ${pricier.type}.`;
}

export function buildNarrative(
  run: Run,
  events: ProgressEvent[],
  _scores: EvalScore[],
): Narrative {
  const podium = buildPodium(run, events);
  const date = new Date(run.startedAt).toISOString().slice(0, 10);
  const model = run.models[0] ?? events[0]?.model ?? "an unnamed model";
  const winner = podium[0] ?? null;
  const loser = podium[podium.length - 1] ?? null;
  const gpuList = run.gpus.map((g) => g.type).join(", ");

  const winnerVsLoserX =
    winner && loser && loser.maxTps > 0 ? winner.maxTps / loser.maxTps : null;

  let prose: string;
  if (!winner) {
    prose = `On ${date}, ${model} was scheduled across ${gpuList}, but no progress data was recorded. The race did not conclude cleanly.`;
  } else if (!loser || winner.gpuId === loser.gpuId) {
    prose = `On ${date}, ${model} ran on ${winner.type} at a peak of ${winner.maxTps.toFixed(1)} tok/s. No rival lane produced comparable data.`;
  } else {
    const xText = winnerVsLoserX ? formatX(winnerVsLoserX) : "—";
    const costW = winner.dollarsPerMillionTokens;
    const costL = loser.dollarsPerMillionTokens;
    prose =
      `On ${date}, ${model} ran across ${gpuList}. ` +
      `${winner.type} finished first at ${winner.maxTps.toFixed(1)} tok/s, ${xText} faster than ${loser.type}. ` +
      `The per-million-token cost: ${costW != null ? `$${costW.toFixed(2)}` : "—"} (${winner.type}) vs ${costL != null ? `$${costL.toFixed(2)}` : "—"} (${loser.type}) — ` +
      `the surprise: ${surprise(winner, loser)}`;
  }

  return {
    title: `${model} on ${gpuList} — ${date}`,
    prose,
    podium,
    headline: {
      date,
      model,
      winner,
      loser,
      winnerVsLoserX,
      winnerCostPerM: winner?.dollarsPerMillionTokens ?? null,
      loserCostPerM: loser?.dollarsPerMillionTokens ?? null,
    },
  };
}
