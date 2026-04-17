---
id: TASK-0035
title: 'model cards — per-model detail pages with registry + live perf + biography'
status: To Do
created: '2026-04-17'
priority: High
---

`/models` shows the grid. `/models/catalog` shows the raw table. But there's no `/models/[name]` detail page for a visitor who clicks in.

For each model, render:
- All registry fields (family, gen, arch, params, active, size, license, release)
- Every benchmark row: tok/s per GPU, $/M, sample counts, last-seen
- Time-series of tok/s per GPU over the last 7 / 30 days
- Quality composite score (once TASK-0037 lands)
- Biography: 2-3 sentences — where it came from, what it's known for. Pull from a seed file `src/lib/model-bios.ts` keyed on family+generation.
- Download link (Ollama pull cmd), Hugging Face card link, original paper link where applicable

Routing: `/models/[encoded-name]`. Encode `:` as `-` so `qwen3.6:35b-a3b` → `qwen3.6-35b-a3b`. Page reads DB on server, no client fetch.

Acceptance: click any row in /models or /models/catalog → detail page renders with everything we know about that model in one place.
