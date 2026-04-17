// Deterministic, memorable names for runs.
//
// Metallurgy, astronomy, craft. Picked from a curated list so every run
// gets a name a human can remember without stepping on the run id (which
// stays canonical). Seed is anything stable — usually the run's UUID —
// and the hash lives in this module so future runs name the same way.
//
// Usage:
//   import { generateRunName } from "@/lib/run-names";
//   const label = generateRunName(runId); // "Crucible-0421"

// Curated list (~60). No duplicates. Evocative but not cute.
export const RUN_NAME_WORDS: readonly string[] = [
  // metallurgy / smithing
  "Crucible",
  "Thermite",
  "Obsidian",
  "Cinder",
  "Anvil",
  "Ember",
  "Ingot",
  "Smelter",
  "Tungsten",
  "Bellows",
  "Forge",
  "Quench",
  "Brazing",
  "Lathe",
  "Bismuth",
  "Antimony",
  "Kiln",
  "Flux",
  "Dross",
  "Slag",
  "Cupola",
  "Carbide",
  "Tempering",
  "Wrought",
  "Alloy",
  "Draft",

  // astronomy
  "Kepler",
  "Tycho",
  "Halley",
  "Hubble",
  "Sagan",
  "Galileo",
  "Copernicus",
  "Vesta",
  "Ceres",
  "Europa",
  "Titan",
  "Triton",
  "Pulsar",
  "Quasar",
  "Nebula",
  "Corona",
  "Umbra",
  "Penumbra",
  "Zenith",
  "Perihelion",
  "Apogee",
  "Sirius",
  "Vega",
  "Rigel",
  "Betelgeuse",
  "Polaris",

  // craft / shop-floor
  "Calipers",
  "Plumb",
  "Scribe",
  "Gauge",
  "Mandrel",
  "Vise",
  "Burnish",
  "Patina",
];

/**
 * FNV-1a 32-bit — pure function, same seed in, same number out. No deps.
 */
function fnv1a(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    // 32-bit multiply: emulate with Math.imul
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Deterministic pretty name for a run, seeded by any stable string
 * (typically the run id). Same seed always yields the same name.
 *
 * Format: `<Word>-<4-hex>` so two runs that collide on the word are
 * still distinguishable, but the word carries personality.
 *
 * Example: `generateRunName("abc-123")` -> `"Crucible-7a3f"`.
 */
export function generateRunName(seed: string): string {
  const h = fnv1a(seed || "unnamed");
  const word = RUN_NAME_WORDS[h % RUN_NAME_WORDS.length];
  const suffix = (h >>> 16).toString(16).padStart(4, "0").slice(0, 4);
  return `${word}-${suffix}`;
}
