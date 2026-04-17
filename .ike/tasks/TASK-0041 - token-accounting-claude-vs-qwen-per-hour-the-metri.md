---
id: TASK-0041
title: 'token accounting — Claude vs Qwen per hour, the metric that makes the delegation plan falsifiable'
status: To Do
created: '2026-04-17'
priority: High
---

**Why this is urgent:** I wrote a whole `.ike/delegation-plan.md` + opened PR #74 widening Qwen's autonomous write/push tooling — all on the claim "Qwen can replace ~60% of Claude's write-work." But I have no idea whether my actual Claude token consumption is 50 K tokens / hr or 500 K tokens / hr, and I have no idea how many tokens Qwen's harness has burned either. The plan is vibes.

**Data we already have:** Every qwen-harness call returns OAI-compat JSON with `usage.prompt_tokens`, `usage.completion_tokens`, `usage.total_tokens`. The harness currently throws that away — only the `finish_reason` + `choices[0].message` is used. Easy fix: emit a structured `log_event` per turn with `details.usage` populated.

**Data we do NOT have:** Claude Code CLI token usage during this session. Anthropic's CLI tracks it internally but doesn't expose it to the app. Options: poll Anthropic Console / usage API with a token (if the user has one for the workspace); or fall back to a manual weekly dump.

**Concrete next actions:**

1. **Extend qwen-harness.py** (scripts/qwen-harness.py):
   ```python
   # in call_qwen(), capture usage from the response:
   usage = data.get("usage") or {}
   # in run(), after each assistant turn:
   log_event(
     f"qwen turn · {usage.get('completion_tokens',0)} out, {usage.get('prompt_tokens',0)} in",
     kind="observation",
     details={"usage": usage, "model": MODEL, "turn": turn},
   )
   ```

2. **New route `/api/metrics/token-split`** — SQL:
   ```sql
   SELECT
     strftime('%Y-%m-%d %H:00', ts/1000, 'unixepoch') AS hour,
     SUM(CAST(json_extract(details, '$.usage.completion_tokens') AS INTEGER)) AS qwen_out,
     SUM(CAST(json_extract(details, '$.usage.prompt_tokens') AS INTEGER)) AS qwen_in
   FROM events
   WHERE actor='eidos-local'
     AND session_id LIKE 'qwen-harness-%'
     AND deleted_at IS NULL
   GROUP BY hour
   ORDER BY hour DESC
   LIMIT 168;  -- one week
   ```

3. **Optional `/research/delegation-effect` page** — SVG stacked area chart: Qwen tokens (sage) stacked under Claude tokens (amber, manually entered from the Anthropic usage API or left nullable) per hour. Caption: "the delegation plan is working if the sage bar grows and the amber bar shrinks."

**Acceptance:** After this lands, I can answer "did delegating TASK-X to Qwen actually save Claude tokens?" with a number from the site's own DB, not a guess. Without it, every future delegation plan entry is unverifiable.
