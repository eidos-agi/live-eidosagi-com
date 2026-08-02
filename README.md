# live.eidosagi.com

Real-time LLM benchmark dashboard. Three Thunder Compute GPU lanes (A6000 / A100 / H100) race head-to-head while events stream in over HTTP.

**Scope:** live race / streaming telemetry. **Not** API model adoption studies or durable go/no-go records — those live under [research-reports/studies](https://github.com/eidos-agi/research-reports/tree/main/studies) and [emf](https://github.com/eidos-agi/emf). Offline metal eval: [eidos-server-llm-testing-01](https://github.com/eidos-agi/eidos-server-llm-testing-01). Full map: [canonical-homes.md](https://github.com/eidos-agi/research-reports/blob/main/docs/canonical-homes.md).
- **Stack**: Next.js 15 (app router) · TypeScript · Tailwind · pnpm
- **Charts**: [uPlot](https://github.com/leeoniya/uPlot) — canvas-based, handles thousands of streaming points at 60fps with no virtual-DOM churn. visx was considered but rejected for this use case: React-tree charts re-render on every event, which is death for a live ticker. uPlot's `setData` imperative update fits the SSE model cleanly.
- **Storage**: flat JSONL under `data/runs/<runId>/` — no DB, intentional. Each run owns a `run.json`, `events.jsonl`, `scores.jsonl`.
- **Streaming**: SSE (`/api/runs/[id]/stream`) tails `events.jsonl` by polling file size. Simple and reliable; swap for `chokidar` or a queue if fanout grows.

## Setup

```bash
pnpm install
cp .env.example .env.local   # fill in INGEST_TOKEN
pnpm dev                     # http://localhost:3000
```

`pnpm build` must pass before pushing — CI will enforce this.

## Deploy

Target: Vercel, project `live-eidosagi-com`, domain `live.eidosagi.com`.

Required env vars:

| Var | Purpose |
| --- | --- |
| `INGEST_TOKEN` | Shared secret; incoming `POST /api/ingest` must send it in `X-Ingest-Token`. |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL for OG tags. |

Note: Vercel serverless disks are ephemeral. For production persistence, replace `src/lib/store.ts` with an S3 or Supabase-backed implementation. This scaffold intentionally keeps the store local so we can validate the shape before committing to infra.

## Ingestion API

All ingestion endpoints require `X-Ingest-Token: <INGEST_TOKEN>`.

### `POST /api/ingest`

Accepts a `ProgressEvent`, an `EvalScore`, or an envelope `{ run?: Run, payload: ProgressEvent | EvalScore }`.

**Progress event (live tok/s tick):**

```bash
curl -X POST https://live.eidosagi.com/api/ingest \
  -H "Content-Type: application/json" \
  -H "X-Ingest-Token: $INGEST_TOKEN" \
  -d '{
    "runId": "run-2026-04-17-a",
    "ts": "2026-04-17T18:22:05Z",
    "gpuId": "gpu-h100",
    "model": "llama-3.1-70b-instruct",
    "useCase": "code-review",
    "tokenPerSec": 142.3,
    "latencyMs": 38,
    "vramUsedMB": 61200,
    "evalProgressIdx": 4,
    "evalTotal": 12
  }'
```

**Eval score (per test case):**

```bash
curl -X POST https://live.eidosagi.com/api/ingest \
  -H "Content-Type: application/json" \
  -H "X-Ingest-Token: $INGEST_TOKEN" \
  -d '{
    "runId": "run-2026-04-17-a",
    "model": "llama-3.1-70b-instruct",
    "useCase": "code-review",
    "testCaseId": "cr-007",
    "composite": 0.84,
    "dimensions": { "correctness": 0.9, "completeness": 0.8, "formatQuality": 0.85, "conciseness": 0.8 },
    "tokPerSec": 140.1
  }'
```

**Attach run metadata on first event (optional; auto-stub otherwise):**

```json
{
  "run": {
    "id": "run-2026-04-17-a",
    "startedAt": "2026-04-17T18:22:00Z",
    "endedAt": null,
    "label": "Nightly Smoke",
    "gpus": [
      { "name": "gpu-a6000", "type": "A6000", "vramGB": 48, "costPerHour": 0.50 },
      { "name": "gpu-a100",  "type": "A100",  "vramGB": 80, "costPerHour": 1.29 },
      { "name": "gpu-h100",  "type": "H100",  "vramGB": 80, "costPerHour": 2.49 }
    ],
    "models": ["llama-3.1-70b-instruct", "qwen-2.5-72b"]
  },
  "payload": { "runId": "run-2026-04-17-a", "...": "..." }
}
```

### Read endpoints (no auth)

| Method | Path | Returns |
| --- | --- | --- |
| `GET` | `/api/runs` | `{ runs: Run[] }` |
| `GET` | `/api/runs/:id` | `{ run, scores }` |
| `GET` | `/api/runs/:id/events` | `{ events: ProgressEvent[] }` (snapshot) |
| `GET` | `/api/runs/:id/stream` | `text/event-stream` of live `ProgressEvent`s |

## Data Model

See `schemas/*.json` and `src/lib/types.ts`.

## Pages

- `/` — three-lane race, live gauges + sparkline
- `/runs` — history table, click through to detail
- `/runs/[id]` — tok/s, latency, VRAM time-series + model × use-case score matrix
- `/compare` — pick models, compare tok/s across GPUs and composite scores

## Project Layout

```
src/
  app/
    api/                   # ingest, run list, run detail, events snapshot, SSE stream
    runs/                  # history + per-run detail
    compare/               # cross-run compare view
  components/              # RaceBoard, RunDetail, CompareBoard, charts
  lib/
    store.ts               # JSONL filesystem store
    types.ts               # shared TS types (mirrors /schemas)
schemas/                   # JSON Schema definitions for external ingestors
data/runs/                 # ingested JSONL (gitignored)
public/og.png              # placeholder OG image
```

## License

Unlicensed / internal.
