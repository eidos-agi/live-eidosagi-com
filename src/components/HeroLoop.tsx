"use client";

/**
 * Three-lane track with amber-brass light pulses moving down each lane at
 * different speeds. Pure inline SVG + CSS keyframes — no JS runtime cost
 * beyond mounting. Must respect prefers-reduced-motion.
 *
 * Target: < 50KB (this file is ~2KB).
 */
export default function HeroLoop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden opacity-25 motion-reduce:opacity-10"
    >
      <svg
        viewBox="0 0 1200 400"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <linearGradient id="pulse" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#c4935a" stopOpacity="0" />
            <stop offset="50%" stopColor="#c4935a" stopOpacity="1" />
            <stop offset="100%" stopColor="#c4935a" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Three lane baselines */}
        <line x1="0" y1="100" x2="1200" y2="100" stroke="#c4935a" strokeOpacity="0.12" strokeWidth="1" />
        <line x1="0" y1="200" x2="1200" y2="200" stroke="#c4935a" strokeOpacity="0.12" strokeWidth="1" />
        <line x1="0" y1="300" x2="1200" y2="300" stroke="#c4935a" strokeOpacity="0.12" strokeWidth="1" />

        {/* Lane 1 — slowest pulse (A6000 "lane") */}
        <rect
          className="lane-pulse lane-pulse-1"
          y="96"
          height="8"
          width="180"
          fill="url(#pulse)"
        />
        {/* Lane 2 — medium pulse (A100 "lane") */}
        <rect
          className="lane-pulse lane-pulse-2"
          y="196"
          height="8"
          width="180"
          fill="url(#pulse)"
        />
        {/* Lane 3 — fastest pulse (H100 "lane") */}
        <rect
          className="lane-pulse lane-pulse-3"
          y="296"
          height="8"
          width="180"
          fill="url(#pulse)"
        />
      </svg>

      <style>{`
        .lane-pulse {
          animation-name: lane-sweep;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        .lane-pulse-1 { animation-duration: 14s; animation-delay: 0s; }
        .lane-pulse-2 { animation-duration: 11s; animation-delay: -3s; }
        .lane-pulse-3 { animation-duration: 8s;  animation-delay: -5s; }
        @keyframes lane-sweep {
          0%   { transform: translateX(-200px); }
          100% { transform: translateX(1400px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .lane-pulse {
            animation: none;
            transform: translateX(400px);
          }
        }
      `}</style>
    </div>
  );
}
