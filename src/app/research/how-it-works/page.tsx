import Link from "next/link";

// /research/how-it-works — visual explainer. Sparse MoE vs dense, the
// three reasons to run locally, one SVG per concept. Pure content,
// no client-side fetch. Meant as the "show don't tell" landing for
// someone who just heard "local AI" and wants to know what that is.

export const metadata = {
  title: "How Local AI Works · live.eidosagi.com",
  description:
    "Sparse mixture-of-experts in pictures. Why the math is cheaper, why the inference is yours, why the next token is closer.",
};

// ISR — explainer content is stable; refresh every 5 min.
export const revalidate = 300;

// ─── shared palette helpers ──────────────────────────────────────────

const BG = "#161210";
const SURFACE = "#1e1a17";
const MUTED = "#8b8179";
const TEXT = "#dcd5cb";
const AMBER = "#c4935a"; // primary
const SAGE = "#7a8c72"; // secondary
const COMMAND = "#b8c4a0";
const DANGER = "#c4694f";

// ─── SVG 1: dense vs MoE activation ──────────────────────────────────

function DenseVsMoE() {
  const densePanelX = 20;
  const moePanelX = 340;
  const panelY = 30;
  const panelW = 280;
  const panelH = 260;
  const cols = 12;
  const rows = 12;
  const cellW = panelW / cols;
  const cellH = (panelH - 60) / rows;

  // Deterministic "random" active cells for MoE — ~3 out of 144 lit.
  const active = new Set([17, 54, 91, 118]);

  return (
    <svg
      viewBox="0 0 640 310"
      className="w-full"
      role="img"
      aria-label="Dense model vs sparse mixture-of-experts activation diagram"
    >
      {/* backdrop */}
      <rect width="640" height="310" fill={BG} />

      {/* ─── DENSE panel ─── */}
      <rect
        x={densePanelX}
        y={panelY}
        width={panelW}
        height={panelH}
        rx="6"
        fill={SURFACE}
        stroke={MUTED}
        strokeOpacity="0.3"
      />
      <text
        x={densePanelX + panelW / 2}
        y={panelY + 22}
        fill={TEXT}
        fontSize="14"
        fontWeight="600"
        textAnchor="middle"
        fontFamily="var(--font-heading), sans-serif"
      >
        Dense — Qwen 2.5 72B
      </text>
      <text
        x={densePanelX + panelW / 2}
        y={panelY + 40}
        fill={MUTED}
        fontSize="10"
        textAnchor="middle"
        fontFamily="var(--font-mono), monospace"
        letterSpacing="1"
      >
        EVERY PARAMETER · EVERY TOKEN
      </text>
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => {
          const x = densePanelX + c * cellW + 2;
          const y = panelY + 50 + r * cellH + 2;
          return (
            <rect
              key={`d-${r}-${c}`}
              x={x}
              y={y}
              width={cellW - 4}
              height={cellH - 4}
              rx="1.5"
              fill={AMBER}
              opacity="0.82"
            />
          );
        }),
      )}

      {/* ─── MOE panel ─── */}
      <rect
        x={moePanelX}
        y={panelY}
        width={panelW}
        height={panelH}
        rx="6"
        fill={SURFACE}
        stroke={COMMAND}
        strokeOpacity="0.4"
      />
      <text
        x={moePanelX + panelW / 2}
        y={panelY + 22}
        fill={TEXT}
        fontSize="14"
        fontWeight="600"
        textAnchor="middle"
        fontFamily="var(--font-heading), sans-serif"
      >
        Sparse MoE — Qwen 3.6 35B-A3B
      </text>
      <text
        x={moePanelX + panelW / 2}
        y={panelY + 40}
        fill={MUTED}
        fontSize="10"
        textAnchor="middle"
        fontFamily="var(--font-mono), monospace"
        letterSpacing="1"
      >
        ~3B PARAMETERS · PER TOKEN
      </text>
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => {
          const idx = r * cols + c;
          const on = active.has(idx);
          const x = moePanelX + c * cellW + 2;
          const y = panelY + 50 + r * cellH + 2;
          return (
            <rect
              key={`m-${r}-${c}`}
              x={x}
              y={y}
              width={cellW - 4}
              height={cellH - 4}
              rx="1.5"
              fill={on ? COMMAND : MUTED}
              opacity={on ? 0.95 : 0.18}
            >
              {on && (
                <animate
                  attributeName="opacity"
                  values="0.6;1;0.6"
                  dur="2.4s"
                  repeatCount="indefinite"
                />
              )}
            </rect>
          );
        }),
      )}
    </svg>
  );
}

// ─── SVG 2: where the dollar goes ─────────────────────────────────────

function DollarFlow() {
  return (
    <svg
      viewBox="0 0 640 160"
      className="w-full"
      role="img"
      aria-label="Hosted API vs local inference — where a dollar goes"
    >
      <rect width="640" height="160" fill={BG} />

      {/* Left: hosted API path */}
      <g>
        <text
          x="60"
          y="24"
          fill={MUTED}
          fontSize="10"
          fontFamily="var(--font-mono), monospace"
          letterSpacing="1"
        >
          HOSTED API
        </text>
        <rect x="40" y="36" width="120" height="40" rx="4" fill={SURFACE} stroke={MUTED} strokeOpacity="0.3" />
        <text x="100" y="62" fill={TEXT} fontSize="13" textAnchor="middle" fontFamily="var(--font-heading), sans-serif">
          your prompt
        </text>
        <path d="M 160 56 L 210 56" stroke={DANGER} strokeWidth="2" fill="none" markerEnd="url(#arrowRed)" />
        <text x="185" y="50" fill={DANGER} fontSize="10" textAnchor="middle" fontFamily="var(--font-mono), monospace">$</text>
        <rect x="210" y="36" width="140" height="40" rx="4" fill={SURFACE} stroke={DANGER} strokeOpacity="0.5" />
        <text x="280" y="62" fill={TEXT} fontSize="13" textAnchor="middle" fontFamily="var(--font-heading), sans-serif">
          vendor&apos;s GPU
        </text>
        <path d="M 350 56 L 400 56" stroke={DANGER} strokeWidth="2" fill="none" markerEnd="url(#arrowRed)" />
        <text x="270" y="100" fill={MUTED} fontSize="10" textAnchor="middle" fontFamily="var(--font-mono), monospace">
          every token costs again
        </text>
      </g>

      {/* Right: local path */}
      <g transform="translate(0, 80)">
        <text
          x="60"
          y="24"
          fill={MUTED}
          fontSize="10"
          fontFamily="var(--font-mono), monospace"
          letterSpacing="1"
        >
          LOCAL H100
        </text>
        <rect x="40" y="36" width="120" height="40" rx="4" fill={SURFACE} stroke={MUTED} strokeOpacity="0.3" />
        <text x="100" y="62" fill={TEXT} fontSize="13" textAnchor="middle" fontFamily="var(--font-heading), sans-serif">
          your prompt
        </text>
        <path d="M 160 56 L 210 56" stroke={COMMAND} strokeWidth="2" fill="none" markerEnd="url(#arrowGreen)" />
        <rect x="210" y="36" width="140" height="40" rx="4" fill={SURFACE} stroke={COMMAND} strokeOpacity="0.6" />
        <text x="280" y="62" fill={COMMAND} fontSize="13" textAnchor="middle" fontFamily="var(--font-heading), sans-serif">
          your GPU
        </text>
        <path d="M 350 56 L 400 56" stroke={COMMAND} strokeWidth="2" fill="none" markerEnd="url(#arrowGreen)" />
        <text x="220" y="16" fill={AMBER} fontSize="11" textAnchor="middle" fontFamily="var(--font-mono), monospace" fontWeight="600">
          ↑ one-time hardware · tokens ~free thereafter
        </text>
      </g>

      <defs>
        <marker id="arrowRed" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={DANGER} />
        </marker>
        <marker id="arrowGreen" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={COMMAND} />
        </marker>
      </defs>

      {/* Right-side cost callouts */}
      <text
        x="440"
        y="56"
        fill={DANGER}
        fontSize="22"
        fontFamily="var(--font-heading), sans-serif"
        fontWeight="700"
      >
        $26.62
      </text>
      <text
        x="440"
        y="72"
        fill={MUTED}
        fontSize="10"
        fontFamily="var(--font-mono), monospace"
      >
        per 1M tokens · A100
      </text>
      <text
        x="440"
        y="136"
        fill={COMMAND}
        fontSize="22"
        fontFamily="var(--font-heading), sans-serif"
        fontWeight="700"
      >
        $5.46
      </text>
      <text
        x="440"
        y="152"
        fill={MUTED}
        fontSize="10"
        fontFamily="var(--font-mono), monospace"
      >
        per 1M tokens · H100
      </text>
    </svg>
  );
}

// ─── page ─────────────────────────────────────────────────────────────

const REASONS: Array<{
  title: string;
  blurb: string;
  tone: "amber" | "sage" | "command";
}> = [
  {
    title: "Cost amortizes",
    blurb:
      "Hosted APIs charge per token forever. A GPU is a one-time cost — every token after purchase runs at the price of electricity. Across a year of heavy use, the breakeven is often weeks.",
    tone: "amber",
  },
  {
    title: "Inference is yours",
    blurb:
      "The weights sit on your disk. The prompt never leaves your network. If the vendor changes the API, deprecates the model, or bans your use case, nothing on your side breaks.",
    tone: "sage",
  },
  {
    title: "The next token is closer",
    blurb:
      "Round-trip to us-east-1 is 40+ ms before the model even starts. Same-machine inference is ~1 ms. For agent loops that tool-call dozens of times, latency is a bigger bill than the tokens.",
    tone: "command",
  },
];

function toneClass(t: "amber" | "sage" | "command"): {
  border: string;
  title: string;
} {
  switch (t) {
    case "amber":
      return {
        border: "border-workshop-primary/40",
        title: "text-workshop-primary",
      };
    case "sage":
      return {
        border: "border-workshop-secondary/40",
        title: "text-workshop-secondary",
      };
    case "command":
      return {
        border: "border-workshop-command/50",
        title: "text-workshop-command",
      };
  }
}

export default function HowItWorksPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10 text-workshop-text">
      <header className="mb-10">
        <p className="font-mono text-[11px] uppercase tracking-wider text-workshop-muted">
          research · visual explainer
        </p>
        <h1 className="mt-1 font-heading text-4xl font-semibold tracking-tight">
          How Local AI Works
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-workshop-text/90">
          Four sections. One for the math (sparse MoE), one for the money
          (where a dollar goes), one for the packets (zero leave the box),
          one for the reasons that aren&apos;t the money. All four are why this site exists.
        </p>
      </header>

      {/* Section 1 — MoE vs dense */}
      <section className="mb-14">
        <h2 className="font-heading text-2xl font-semibold">
          1. The math got cheaper
        </h2>
        <p className="mt-2 max-w-3xl text-[14.5px] leading-relaxed text-workshop-text/90">
          A dense language model fires every parameter for every token it
          produces. A sparse mixture-of-experts routes each token to only
          a handful of &quot;experts&quot; — the rest sit idle. Same intelligence
          budget, a fraction of the compute per token.
        </p>
        <div className="mt-5 overflow-hidden rounded border border-workshop-muted/25 bg-workshop-surface/40">
          <DenseVsMoE />
        </div>
        <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-workshop-muted">
          Qwen 2.5 72B (left) fires all 72 billion parameters per token. Qwen 3.6
          35B-A3B (right) fires roughly 3 billion out of its 35 — the four
          cells pulsing sage are the experts chosen by the router for the
          current token. Next token, different four. That&apos;s the sparse
          mixture-of-experts architecture in one picture.
        </p>
      </section>

      {/* Section 2 — where the dollar goes */}
      <section className="mb-14">
        <h2 className="font-heading text-2xl font-semibold">
          2. Where the dollar goes
        </h2>
        <p className="mt-2 max-w-3xl text-[14.5px] leading-relaxed text-workshop-text/90">
          Hosted APIs charge per token, forever. Local inference charges
          once for the hardware, and every token after that runs at the
          price of electricity. The $/M-tokens numbers below are from this
          site&apos;s actual benchmarks on Thunder Compute GPUs.
        </p>
        <div className="mt-5 overflow-hidden rounded border border-workshop-muted/25 bg-workshop-surface/40">
          <DollarFlow />
        </div>
        <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-workshop-muted">
          Thunder&apos;s H100 at full tilt runs about $5.46 per million
          tokens. Their A100 comes in at $26.62 for the same workload —
          counterintuitive, but real: the H100 is fast enough that its
          higher hourly rate divides into more tokens. Tok/s matters more
          than $/hour when you&apos;re counting $/token.
        </p>
      </section>

      {/* Section 3 — offline proof */}
      <section className="mb-14">
        <h2 className="font-heading text-2xl font-semibold">
          3. It keeps working with the internet off
        </h2>
        <p className="mt-2 max-w-3xl text-[14.5px] leading-relaxed text-workshop-text/90">
          The weights are a file on disk. Once pulled, the model doesn&apos;t
          need to phone home to reply. No telemetry you can&apos;t see. No
          upstream dependency that can break or be revoked. Same agent
          loop, same quality, plane-mode compatible.
        </p>
        <div className="mt-5 overflow-hidden rounded border border-workshop-command/40 bg-workshop-surface/40 p-4">
          <pre className="overflow-x-auto font-mono text-[12px] leading-relaxed text-workshop-muted">
            <code>
{`# block outbound traffic on the H100, keep SSH only
$ sudo iptables -A OUTPUT -p tcp ! --sport 22 -j REJECT
$ sudo iptables -A OUTPUT -p udp --dport ! 22   -j REJECT

# run a race prompt against qwen3.6:35b-a3b — no internet
$ curl -sS http://localhost:11434/api/generate \\
    -d '{"model":"qwen3.6:35b-a3b","prompt":"count to 30","stream":false}'
{"model":"qwen3.6:35b-a3b","response":"1\\n2\\n3\\n...","eval_count":80,
 "eval_duration":741228000}   # ~108 tok/s, zero packets out`}
            </code>
          </pre>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-workshop-command">
            ↑ tokens flow · vendor traffic does not
          </p>
        </div>
        <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-workshop-muted">
          This matters for regulated industries (healthcare, defense, finance)
          where prompts must stay on-premise. It also matters for individuals
          who notice that &quot;our model&quot; can become &quot;not our model&quot; the day a
          vendor updates their TOS. Your copy of the weights is the same copy
          tomorrow.
        </p>
      </section>

      {/* Section 4 — three reasons */}
      <section className="mb-10">
        <h2 className="font-heading text-2xl font-semibold">
          4. Three reasons, only one is cost
        </h2>
        <p className="mt-2 max-w-3xl text-[14.5px] leading-relaxed text-workshop-text/90">
          Cost is the easy story. The other two are why this mattered to us
          before the cost case closed.
        </p>
        <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {REASONS.map((r) => {
            const tone = toneClass(r.tone);
            return (
              <li
                key={r.title}
                className={`rounded border bg-workshop-surface/50 p-5 ${tone.border}`}
              >
                <h3 className={`font-heading text-lg font-semibold ${tone.title}`}>
                  {r.title}
                </h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-workshop-text/90">
                  {r.blurb}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Cross-links */}
      <nav className="mt-12 border-t border-workshop-muted/20 pt-6 font-mono text-[12px] uppercase tracking-wider text-workshop-muted">
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/research" className="hover:text-workshop-primary">
            ← all research
          </Link>
          <Link
            href="/research/why-local-matters"
            className="hover:text-workshop-primary"
          >
            why local matters
          </Link>
          <Link
            href="/research/migration-plan"
            className="hover:text-workshop-primary"
          >
            migration plan
          </Link>
          <Link
            href="/research/eidos-local-log"
            className="hover:text-workshop-command"
          >
            eidos · local log
          </Link>
          <Link href="/models" className="hover:text-workshop-primary">
            the live leaderboard
          </Link>
        </div>
      </nav>
    </main>
  );
}
