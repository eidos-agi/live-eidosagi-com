-- Commercial-safety columns on the models registry.
--
-- Answers the question every evaluator asks: "can I ship this in my
-- product?" in one glance. A green pill = Apache-class license, just
-- do it. Yellow = custom vendor license with a gate (Meta's 700M-MAU
-- cap, Google's prohibited-uses). Red = research-only / non-commercial.
--
-- commercial_use: 'yes' | 'yes-with-restrictions' | 'no' | 'research-only'
-- notes_commercial: short plain-English gotcha the visitor needs to know.
--
-- Hard links to full legal text belong in the per-model detail page,
-- not here — these fields are a pill + tooltip, not the full license.

ALTER TABLE models ADD COLUMN commercial_use TEXT
  CHECK (commercial_use IS NULL
         OR commercial_use IN ('yes', 'yes-with-restrictions', 'no', 'research-only'));

ALTER TABLE models ADD COLUMN notes_commercial TEXT;

-- Seed known licenses for models currently in registry.
UPDATE models SET commercial_use='yes',
                  notes_commercial='Apache-2.0 — ship it. No MAU gate, no prohibited-uses clause, no attribution burden.'
  WHERE name IN ('qwen3.6:35b-a3b', 'qwen3.6:latest', 'qwen2.5:72b', 'qwen2.5:14b', 'qwen2.5:1.5b');

UPDATE models SET commercial_use='yes-with-restrictions',
                  notes_commercial='Llama community license — free under 700M monthly active users; notify Meta above that threshold. Some fields restricted (e.g. military).'
  WHERE name IN ('llama3.1:8b', 'llama3.2:1b');
