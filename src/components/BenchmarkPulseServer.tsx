// Server wrapper for BenchmarkPulse — pre-fetches the latest benchmark
// event at render time so the strip shows real data on first paint
// instead of flashing "benchmark · waiting for signal" for 200-500 ms
// while the client hydrates.
//
// Pattern mirrors SavingsStripServer.

import BenchmarkPulse from "./BenchmarkPulse";
import { latestEventByActor } from "@/lib/db";

export default function BenchmarkPulseServer() {
  let initial = null;
  try {
    initial = latestEventByActor("benchmark");
  } catch {
    // DB unavailable — client will fetch and fall back to "waiting for signal".
    initial = null;
  }
  return <BenchmarkPulse initial={initial} />;
}
