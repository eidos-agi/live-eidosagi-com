---
id: TASK-0049
title: 'Tailwind v3 → v4 migration (new engine, @theme, CSS-variable-native) — vintage find'
status: To Do
created: '2026-04-17'
priority: Normal
---

**Vintage find (model-vintage check 2026-04-17 22:55-ish):** `package.json` pins `tailwindcss: ^3.4.15`. Tailwind v4 has been stable for months — new Rust-based engine (Oxide), CSS-variable-native (the whole `var(--color-*)` scheme we set up in globals.css maps to v4's `@theme` block), no more JS config file needed.

**Why this isn't trivial:** v4 is a breaking migration, not a point upgrade.

1. Config moves from `tailwind.config.ts` → `@theme { … }` in `globals.css`. Our workshop palette (`--color-bg`, `--color-surface`, etc.) needs to be restructured into the `@theme` block so Tailwind can consume it.
2. Some utility renames (most are covered by `@tailwindcss/upgrade` codemod).
3. Next.js integration changes — the PostCSS plugin moves from `tailwindcss` to `@tailwindcss/postcss`.
4. Every arbitrary-value usage we have (`bg-[var(--color-bg)]`, `text-[10px]`, etc.) should keep working but needs a spot check.

**Upgrade command:**
```bash
npx @tailwindcss/upgrade@latest
pnpm add -D @tailwindcss/postcss tailwindcss@next
# then manually move workshop palette from tailwind.config.ts -> @theme in globals.css
# verify: pnpm build ; visit / ; confirm workshop palette renders identical
```

**Why not ship this session:** visual regression risk is real and there's no designer available to compare. Should go in its own focused PR with before/after screenshots of `/`, `/research/how-it-works` (SVG relies on palette), `/models` (family chip colors).

**Acceptance:** `pnpm list tailwindcss` shows 4.x; `/research/how-it-works` MoE SVG still shows correct amber/sage; `/models` cards still show correct family tone; no visual regressions on the homepage's SavingsStrip/BenchmarkPulse.
