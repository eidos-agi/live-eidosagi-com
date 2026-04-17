-- Model registry.
--
-- A first-class table for the LLMs we pull, run, and benchmark. Previously
-- model info lived in three places: hardcoded arrays in the race script,
-- the `runs.models` JSON column, and prose inside /research/*. Now it has
-- one home the website + harness can both read.
--
-- Rows are seeded with the Qwen / Llama lineup currently on the H100 and
-- backfilled on first boot; updates come from /api/ingest kind='model'
-- (or direct upserts in the race/harness scripts).

CREATE TABLE IF NOT EXISTS models (
  name              TEXT PRIMARY KEY,          -- e.g. 'qwen3.6:35b-a3b'
  family            TEXT NOT NULL,             -- 'qwen', 'llama', 'gemma', 'deepseek'
  generation        TEXT,                      -- '3.6', '2.5', '3.1', etc.
  architecture      TEXT,                      -- 'dense' | 'moe'
  total_params_b    REAL,                      -- billions, e.g. 35, 72, 1.5
  active_params_b   REAL,                      -- billions (dense = total; MoE = active per token)
  size_gb           REAL,                      -- on-disk size of the Ollama blob
  license           TEXT,                      -- 'Apache-2.0', 'Llama-3-license', etc.
  released_at       TEXT,                      -- ISO 8601 yyyy-mm-dd
  hardware_target   TEXT,                      -- 'H100' | 'A100' | 'A6000' | 'any'
  pulled_on_h100    INTEGER NOT NULL DEFAULT 0,
  default_in_harness INTEGER NOT NULL DEFAULT 0,
  in_race_rotation  INTEGER NOT NULL DEFAULT 0,
  notes             TEXT,
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL,
  deleted_at        INTEGER
);

CREATE INDEX IF NOT EXISTS models_family_gen ON models(family, generation);
CREATE INDEX IF NOT EXISTS models_pulled ON models(pulled_on_h100, default_in_harness);

-- Seed the lineup currently on the H100 (as of 2026-04-17).
-- UPSERT semantics so re-running the migration is safe.
INSERT INTO models (
  name, family, generation, architecture, total_params_b, active_params_b,
  size_gb, license, released_at, hardware_target, pulled_on_h100,
  default_in_harness, in_race_rotation, notes, created_at, updated_at
) VALUES
  ('qwen3.6:35b-a3b', 'qwen', '3.6', 'moe', 35, 3,
   23, 'Apache-2.0', '2026-04-16', 'H100', 1,
   1, 1, 'Harness default since ADR-006. Sparse MoE — only ~3B params fire per token.',
   strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('qwen3.6:latest', 'qwen', '3.6', 'moe', 35, 3,
   23, 'Apache-2.0', '2026-04-16', 'H100', 1,
   0, 0, 'Alias for qwen3.6:35b-a3b (same Ollama blob ID).',
   strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('qwen2.5:72b', 'qwen', '2.5', 'dense', 72, 72,
   47, 'Apache-2.0', '2024-09-19', 'H100', 1,
   0, 1, 'Older dense model. Kept for apples-to-apples comparison with 3.6.',
   strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('qwen2.5:14b', 'qwen', '2.5', 'dense', 14, 14,
   9.0, 'Apache-2.0', '2024-09-19', 'any', 1,
   0, 1, 'Mid-size dense. Fits all three Thunder tiers.',
   strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('qwen2.5:1.5b', 'qwen', '2.5', 'dense', 1.5, 1.5,
   0.986, 'Apache-2.0', '2024-09-19', 'any', 1,
   0, 1, 'Small dense. Used on A6000 for baseline race throughput.',
   strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('llama3.1:8b', 'llama', '3.1', 'dense', 8, 8,
   4.9, 'Llama-3.1-license', '2024-07-23', 'any', 1,
   0, 1, 'Meta baseline. Older than Qwen 2.5; kept for narration/race diversity.',
   strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('llama3.2:1b', 'llama', '3.2', 'dense', 1, 1,
   1.3, 'Llama-3.2-license', '2024-09-25', 'any', 1,
   0, 1, 'Tiniest model in rotation. Hits 100+ tok/s on H100.',
   strftime('%s','now')*1000, strftime('%s','now')*1000)
ON CONFLICT(name) DO UPDATE SET
  family = excluded.family,
  generation = excluded.generation,
  architecture = excluded.architecture,
  total_params_b = excluded.total_params_b,
  active_params_b = excluded.active_params_b,
  size_gb = excluded.size_gb,
  license = excluded.license,
  released_at = excluded.released_at,
  hardware_target = excluded.hardware_target,
  pulled_on_h100 = excluded.pulled_on_h100,
  default_in_harness = excluded.default_in_harness,
  in_race_rotation = excluded.in_race_rotation,
  notes = excluded.notes,
  updated_at = strftime('%s','now')*1000;
