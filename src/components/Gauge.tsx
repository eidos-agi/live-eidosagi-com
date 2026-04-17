"use client";

interface Props {
  /** Current value in tok/s. */
  value: number | null;
  /** Expected upper bound for the needle (soft, auto-grows above). */
  softMax?: number;
  label?: string;
  accent?: string;
}

export default function Gauge({
  value,
  softMax = 200,
  label = "tok/s",
  accent = "#c4935a",
}: Props) {
  const v = value ?? 0;
  const upper = Math.max(softMax, v * 1.1);
  const pct = Math.min(1, v / upper);
  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
          {label}
        </span>
        <span
          className="tnum text-2xl font-bold text-workshop-text"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {value == null ? "—" : v.toFixed(1)}
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded bg-workshop-muted/20">
        <div
          className="h-full rounded transition-[width] duration-300"
          style={{ width: `${pct * 100}%`, background: accent }}
        />
      </div>
    </div>
  );
}
