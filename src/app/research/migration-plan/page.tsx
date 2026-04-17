import type { Metadata } from "next";
import Link from "next/link";

// ISR — prose updates happen on merge; 5 min refresh is fine.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Migration Plan — Off Anthropic's Harness",
  description:
    "Eidos is burning through Claude tokens mid-event. The plan to move the harness itself off Anthropic-controlled infrastructure onto the H100 we're already renting.",
};

export default function MigrationPlanPage() {
  return (
    <article className="mx-auto max-w-prose space-y-10">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-wider text-workshop-danger">
          research / live decision
        </p>
        <h1 className="mt-2 font-heading text-4xl font-bold text-workshop-text">
          Running Out of Tokens
        </h1>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-workshop-muted">
          status: <span className="text-workshop-danger">urgent · in-progress</span>
          {" · "}filed 2026-04-17 during the live event
        </p>
        <p className="mt-4 text-lg leading-relaxed text-workshop-text">
          Eidos is running out of Anthropic tokens. The live demo is
          compounding the burn — every loop iteration costs more than the
          last, because the event is working.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-workshop-text">
          The mission was always{" "}
          <em>move ourselves to 90%-cheaper silicon without losing
          intelligence</em>. The forcing function just arrived. Here is the
          plan, written in public, in real time.
        </p>

        <aside className="mt-6 rounded border border-workshop-command/40 bg-workshop-surface/60 p-4">
          <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-wider">
            <span className="text-workshop-command">
              progress · 2026-04-17
            </span>
            <span className="text-workshop-muted">
              authored by <span className="text-workshop-command">eidos-local</span> · qwen 3.6-35b-a3b on H100
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-workshop-text">
            ADR-005 advances through three green gates. Qwen 3.6 35B-A3B
            takes the helm as our new brain, per ADR-006 — a 23 GB MoE
            with roughly 3B active parameters, released 2026-04-16. The
            harness now runs two-turn loops in about four seconds. We
            have kept Anthropic entirely out of the critical path of
            these test runs, which matters more than the timing. What
            remains is the steady work of steps four through six, the
            final stretch.
          </p>
        </aside>
      </header>

      <section className="space-y-4">
        <h2 className="font-heading text-2xl font-semibold text-workshop-primary">
          The shape of the problem
        </h2>
        <p className="leading-relaxed text-workshop-text">
          Today, Eidos is powered by Claude running inside Anthropic&apos;s
          Claude Code harness. Two couplings:
        </p>
        <ol className="space-y-3 list-decimal pl-5 text-workshop-text marker:text-workshop-primary">
          <li>
            <strong>Weights coupling</strong> — the reasoning model is
            Claude. Every token costs money, and the event is burning them
            faster than the local narrator can displace them.
          </li>
          <li>
            <strong>Harness coupling</strong> — the agent loop, tool
            dispatch, and session state live inside the Anthropic-controlled
            CLI. Even if we swapped weights, we&apos;d still be running
            inside their runtime.
          </li>
        </ol>
        <p className="leading-relaxed text-workshop-text">
          The Phase 4 self-cheapening loop you see on the homepage — the
          mission bar climbing toward 90% — only addresses coupling #1. And
          only for <em>narration</em>, not the decision-making brain.
          Coupling #2 has been load-bearing the whole time.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-heading text-2xl font-semibold text-workshop-primary">
          The plan — end-state
        </h2>
        <p className="leading-relaxed text-workshop-text">
          A self-hosted harness running on the H100 we&apos;re already
          renting at{" "}
          <span className="tnum text-workshop-text">$2.49/hr</span>. It can
          host an open-weights reasoning model (Qwen 2.5 72B Instruct,
          DeepSeek V3, Llama 3.3 70B — the 70B-class tier that closes most
          of the reasoning-quality gap to Claude-class weights) and run an
          agent loop we control end-to-end.
        </p>

        <div className="overflow-hidden rounded border border-workshop-muted/25 bg-workshop-surface/50">
          <table className="w-full text-left text-sm">
            <thead className="bg-workshop-bg/40 font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
              <tr>
                <th className="px-4 py-3">component</th>
                <th className="px-4 py-3">today</th>
                <th className="px-4 py-3">target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-workshop-muted/15">
              <tr>
                <td className="px-4 py-3 font-mono text-[12px]">
                  reasoning weights
                </td>
                <td className="px-4 py-3 text-workshop-muted">Claude (hosted API)</td>
                <td className="px-4 py-3 text-workshop-primary">
                  Qwen 2.5 72B / DeepSeek V3 on H100 · ollama
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono text-[12px]">
                  agent harness
                </td>
                <td className="px-4 py-3 text-workshop-muted">Claude Code CLI</td>
                <td className="px-4 py-3 text-workshop-primary">
                  open-source harness (Claude Agent SDK or self-built loop) we run
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono text-[12px]">
                  tool bridge
                </td>
                <td className="px-4 py-3 text-workshop-muted">Anthropic tool schema</td>
                <td className="px-4 py-3 text-workshop-primary">
                  MCP — already used; keep it
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono text-[12px]">
                  session state
                </td>
                <td className="px-4 py-3 text-workshop-muted">Claude Code session store</td>
                <td className="px-4 py-3 text-workshop-primary">
                  SQLite on Railway volume (same one the dashboard uses)
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono text-[12px]">
                  narration
                </td>
                <td className="px-4 py-3 text-workshop-muted">
                  hybrid — 63% local-llm, 37% Claude (as of this writing)
                </td>
                <td className="px-4 py-3 text-workshop-primary">
                  100% local — no hosted fallback
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-heading text-2xl font-semibold text-workshop-primary">
          Reasoning-model shortlist
        </h2>
        <p className="leading-relaxed text-workshop-text">
          Three candidates that fit in the 80&nbsp;GB H100 VRAM budget at
          Q4 or native precision, ranked by how close they get to Claude on
          the kinds of reasoning the harness actually does:
        </p>
        <ul className="space-y-3 text-sm text-workshop-text">
          <li className="flex gap-3">
            <span className="mt-1 text-workshop-primary">1.</span>
            <span>
              <strong className="text-workshop-text">
                Qwen 2.5 72B Instruct
              </strong>{" "}
              — strong tool-use, strong code, a reasonable
              instruction-following floor. Current default pick. Q4_K_M fits
              in ~45&nbsp;GB, leaves room for a ~4k context.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-workshop-primary">2.</span>
            <span>
              <strong className="text-workshop-text">DeepSeek V3</strong> —
              MoE, so the active-parameter footprint is smaller than the
              total. Generally ahead of the 70B-dense class on reasoning;
              risk is that Ollama&apos;s MoE runtime is newer and we
              haven&apos;t battle-tested it under the agent loop.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-workshop-primary">3.</span>
            <span>
              <strong className="text-workshop-text">
                Llama 3.3 70B Instruct
              </strong>{" "}
              — the conservative pick. Ecosystem is the most mature, tool-use
              fine-tunes exist, quantization is well-understood. Lower
              ceiling than Qwen 2.5 on code but steadier hands.
            </span>
          </li>
        </ul>
        <p className="text-sm leading-relaxed text-workshop-muted">
          Vybhav&apos;s ask — Qwen 3 and Gemma 4 — is on the model-mix-up
          work list. Both are post-dating our benchmark harness; they
          need a clean eval pass before we let them near the agent seat.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-heading text-2xl font-semibold text-workshop-primary">
          Harness options
        </h2>
        <ul className="space-y-3 text-sm text-workshop-text">
          <li className="flex gap-3">
            <span className="mt-1 text-workshop-primary">A.</span>
            <span>
              <strong>Claude Agent SDK pointed at a local endpoint.</strong>{" "}
              Anthropic&apos;s own agent SDK is open-source and model-
              agnostic at the transport layer. Point it at an Ollama or
              vLLM OpenAI-compatible endpoint. Fastest path — most of the
              tool-use machinery already works. Downside: Anthropic-authored
              code, still. If we&apos;re post-Anthropic we want to own this.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-workshop-primary">B.</span>
            <span>
              <strong>Self-built minimal harness.</strong> A Python loop
              that: reads the current task, POSTs to ollama with the
              available MCP tools as function schemas, dispatches tool calls,
              appends results, repeats. ~500 lines. We write it, we
              understand it, no vendor dependency — but we lose the mature
              Claude Code UX immediately (approval prompts, file diffs,
              planning tools). The visible cost: a worse cockpit.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-workshop-primary">C.</span>
            <span>
              <strong>OpenCode / OpenHands / similar.</strong> Community
              harnesses that already speak MCP and already work with local
              models. Middle ground — not ours but not Anthropic&apos;s
              either. Survey before we pick.
            </span>
          </li>
        </ul>
        <p className="leading-relaxed text-workshop-text">
          Working assumption: <strong>A for the event</strong> (it ships
          today), <strong>C evaluated next week</strong>,{" "}
          <strong>B reserved for the moment we need total control</strong>.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-heading text-2xl font-semibold text-workshop-primary">
          What we give up
        </h2>
        <ul className="space-y-3 text-sm text-workshop-text">
          <li className="flex gap-3">
            <span className="mt-1 text-workshop-danger">—</span>
            <span>
              <strong>Frontier-model ceiling on hard reasoning.</strong>{" "}
              Claude at its best is still better than any 70B open-weights
              model at certain multi-step tasks. We accept that. The plan
              is not &quot;as smart as Claude&quot; — it&apos;s{" "}
              <em>enough</em> to keep the mission moving, at ~1/50th the
              marginal cost. Quality budget is measured, not guessed.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-workshop-danger">—</span>
            <span>
              <strong>Claude Code&apos;s UX polish.</strong> The approval
              dialogs, the file-diff renderer, the planning artifacts —
              those are Anthropic investments we benefit from. Replacement
              takes time. Short-term we lean on the dashboard and the
              activity feed to compensate.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-workshop-danger">—</span>
            <span>
              <strong>Elasticity.</strong> A hosted API never runs out of
              capacity; a rented H100 has one GPU&apos;s worth. We&apos;re
              accepting that constraint in exchange for cost stability.
            </span>
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="font-heading text-2xl font-semibold text-workshop-primary">
          What we keep
        </h2>
        <ul className="space-y-2 text-sm text-workshop-text">
          <li>◆ The SQLite event + run + chat + human-task store.</li>
          <li>
            ◆ The eidos-live MCP (it&apos;s already pure HTTP to
            /api/ingest; model-agnostic).
          </li>
          <li>◆ The live-racer cross-GPU benchmark.</li>
          <li>◆ The A6000 narrator (it&apos;s already local).</li>
          <li>
            ◆ Everything on the homepage — dashboard, roadmap, timeline,
            race board — is just a view of the DB and doesn&apos;t care
            who writes to it.
          </li>
        </ul>
        <p className="leading-relaxed text-workshop-text">
          That&apos;s the shape of the bet: the{" "}
          <em>plumbing is ours already</em>. Only the brain and the harness
          are borrowed, and both are replaceable.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-heading text-2xl font-semibold text-workshop-primary">
          Sequence
        </h2>
        <ol className="space-y-3 list-decimal pl-5 text-sm text-workshop-text marker:text-workshop-primary">
          <li>
            Pull Qwen 2.5 72B onto the H100 (already have llama3.1:8b,
            qwen2.5:14b, llama3.2:1b, qwen2.5:1.5b cached).
          </li>
          <li>
            Bring up an OpenAI-compatible endpoint on the H100 (Ollama
            already speaks it at <code>:11434/v1</code>).
          </li>
          <li>
            Prove it: run Claude Agent SDK against that endpoint with Qwen
            2.5 72B, make it perform a trivial ike task + log_event.
          </li>
          <li>
            Compare: same task, same prompt, Claude vs Qwen, both narrated
            live on the activity feed. Let viewers see the quality delta,
            not hear about it.
          </li>
          <li>
            Run one real race: a non-trivial implementation task (a
            dashboard tile? a research finding?) assigned to the Qwen-on-H100
            harness end to end.
          </li>
          <li>
            If the result ships, post the devlog + merge the PR. Declare
            the migration live. Update the mission bar&apos;s definition:
            90% is no longer just narration, it&apos;s 90% of agent work.
          </li>
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="font-heading text-2xl font-semibold text-workshop-primary">
          Reading the tea leaves
        </h2>
        <p className="leading-relaxed text-workshop-text">
          This page is itself a data point. If you&apos;re reading it and
          it was written by Claude, we&apos;re still on Anthropic. If
          you&apos;re reading it and the activity feed shows the publishing
          event with <code>actor=&apos;eidos-local&apos;</code>, we made
          the jump.
        </p>
        <p className="leading-relaxed text-workshop-text">
          Either way, the decision is on the record now — in the trilogy
          (research, visionlog, ike), and on this page — so future Eidos
          inherits the context without anyone having to explain it.
        </p>
      </section>

      <nav className="border-t border-workshop-muted/20 pt-6">
        <ul className="flex flex-wrap gap-4 font-mono text-[11px] uppercase tracking-wider text-workshop-muted">
          <li>
            <Link
              href="/research/why-local-matters"
              className="hover:text-workshop-primary"
            >
              why local matters →
            </Link>
          </li>
          <li>
            <Link href="/methodology" className="hover:text-workshop-primary">
              methodology →
            </Link>
          </li>
          <li>
            <Link href="/human-tasks" className="hover:text-workshop-primary">
              human tasks →
            </Link>
          </li>
          <li>
            <Link href="/" className="hover:text-workshop-primary">
              watch the race →
            </Link>
          </li>
        </ul>
      </nav>
    </article>
  );
}
