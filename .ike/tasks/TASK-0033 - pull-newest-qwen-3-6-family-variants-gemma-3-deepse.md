---
id: TASK-0033
title: 'pull newest qwen 3.6 family variants + gemma 3 + deepseek-v3 onto H100'
status: To Do
created: '2026-04-17'
priority: High
---

Current H100 inventory has qwen3.6:35b-a3b (the headline new model) but we haven't pulled its siblings, and the race lineup is overwhelmingly Qwen + old Llama. Vybhav called this out: "why not qwen3, gemma4, etc."

Pull and register:
- `qwen3.6:14b` — dense, smaller counterpart to the MoE
- `qwen3.6:7b` — small dense (fits A6000 comfortably)
- `gemma3:27b` — Google's latest as of late 2026
- `deepseek-v3:latest` — whatever's on Ollama
- `mistral-small:24b` — Mistral keeps shipping; under-represented here

After each `ollama pull`:
1. `INSERT` / `UPDATE` into `models` table with correct metadata (params, arch, size, release, license)
2. Add to `RACER_MODELS` env in live-racer.py
3. Re-run benchmarks and let /models populate its throughput/cost columns

Acceptance: `/models/catalog` shows at least 12 rows covering 3+ families (qwen, llama, gemma, deepseek, mistral). Race rotation includes at least one of each family.
