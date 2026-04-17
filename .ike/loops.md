# Active loops on live.eidosagi.com

The agent runs two kinds of recurring work while a human is around:

1. **Crons** — scheduled via `CronCreate`, fire on a fixed schedule while this Claude session is alive. Session-only (in-memory, auto-expires after 7 days). Cancel any with `CronDelete <id>`.
2. **User-triggered templates** — prompts the human types verbatim at irregular intervals; they're not scheduled from the agent side.

All loops emit at least one `log_event` so their output is visible on the live feed.

---

## Active crons

| ID | Cadence (cron) | Cadence (human) | Purpose |
|----|----------------|-----------------|---------|
| `837fb8e7` | `*/15 * * * *` | every 15 min | **Vision push** — keep building toward "beautiful, living-streaming, interactive, impressive, LIVE, properly logged, properly cached, properly researched." Each firing picks ONE highest-leverage move that advances a vision beat, ships or files an ike task. |
| `46bc35ec` | `4,34 * * * *` | every 30 min | **Self-improvement log** — ≤ 200 words reflection on the last 30 min: repeated-pattern waste, gates missed, root cause of user frustration, tool to default to. Appended to `.ike/self-improvement.md` with ISO timestamp header. No PR. |
| `f45207a8` | `9,29,49 * * * *` | every 20 min | **Simpler-or-smarter check** — pick ONE thing I'm doing the pattern-match way that could be a single parallel batch / shorter component / Qwen delegation / single-command probe. Appended to `.ike/self-improvement.md`. Ship only if trivial. |
| `630cb0cf` | `17,57 * * * *` | every 40 min | **Model-vintage check** — find ONE older thing I'm relying on (LLM checkpoint, library, framework version, API shape) and either upgrade it or file the exact upgrade ike task. Log one event. |
| `30c52cf3` | `23 * * * *` | every 60 min | **Metrics-gap check** — what metric is NOT being tracked that would have shaped a decision today? Candidates: Qwen-vs-Claude token/hr split, /research visit vs bounce, build-time trend, PR time-to-merge, benchmark coverage gaps. Pick one, file ike task with the SQL/probe, append to `.ike/self-improvement.md`. |

These are **session-only**. If this Claude session dies, they die with it. `CronList` shows whatever is still registered.

---

## User-triggered templates

These arrive as explicit user messages with a verbatim template. They're not self-scheduled by the agent.

| Trigger | Typical cadence | Purpose |
|---------|-----------------|---------|
| **BENCHMARK CHECK** | every 12 min | Audit: (a) H100 / A100 / A6000 alive via SSH + `ollama /api/version`; (b) benchmarks landing on the feed in the last 2 h; (c) `/api/savings.local_share` climbing, not stuck at 0%; (d) critical paths healthy (build, SSE, chat). Pick whichever is most off-track, fix OR file an ike task. Emit one summary log_event. Under 8 min. |
| **UX IMPRESSION CHECK** | every 10 min | `curl` the homepage + compute WCAG AA ratios on workshop palette + scan for motion/animation markers. Pick ONE visual gap (progress signals / contrast / motion), ship a small fix OR file a targeted ike task. Log event with assessment + contrast measurements. Under 10 min. Bias toward visual, not text. |
| **HOURLY END-GOALS REFOCUS** | every 60 min | Step back. Re-read cockpit-eidos trilogy + visionlog. Ask: what's the ONE highest-leverage thing toward "beautiful, living, logged, cached, researched" that has NOT been touched this hour? Ship or file the next-up ike task. Emit log_event framing the hour's focus. Under 5 min. |
| **SHAKE THE SODA CAN** | every ~30 min | Half-hour liveness pulse. Pick ONE of: (a) small unexpected delight (easter egg / hover state / subtle sound / status word-swap); (b) fix a real bug noticed but unaddressed; (c) reconsider an assumption about how the site works in a short devlog log_event. Emit at least one log_event after acting. Under 15 min. Don't over-engineer. |

---

## Conventions across all loops

- **Each firing emits ≥ 1 `log_event`** so a visitor watching the live feed sees the agent thinking on camera.
- **Reflection loops** (self-improvement, simpler-or-smarter, metrics-gap) write to `.ike/self-improvement.md` as append-only, newest at bottom. Entries are ≤ 200 words.
- **Action loops** (benchmark, UX, vision push, shake) pick at most ONE concrete thing to ship or file. If the last 3 audits surfaced the same gap and a PR already addresses it, the loop should say so and stop — not re-invent work.
- **Any fix that touches shared infrastructure** (SSH-writing to a GPU host, modifying a deploy workflow in a running session) stops and asks. Read-only probes are fine.
- **Crons auto-expire after 7 days.** Nothing is written to disk on the cron side.

---

## Current in-flight PRs as of 2026-04-17T22:30Z (this document)

10 session PRs have merged (the big cascade: caching, models registry, motion/life, BenchmarkPulse ticker, research index, pit-wall word swap, ingest gate, deploy workflow + service name). 5 open:

- **#73** — properly cached (ISR + s-maxage)
- **#74** — widen qwen-harness (review-only, delegation plan)
- **#75** — BenchmarkPulseServer SSR seed (kills first-paint flash)
- **#76** — `.gitignore` nit for railguey_doctor
- **#77** — stop tracking `__pycache__/*.pyc`
- **#78** — `/models/[name]` detail pages

Plus branch `self-improvement-seed` — diary + model-vintage fix + this loops doc — intentionally NOT PR'd per the 20-min simpler-way rule (batched housekeeping).
