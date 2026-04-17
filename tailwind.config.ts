import type { Config } from "tailwindcss";

// Workshop palette — pulled from eidosagi.com/src/styles/tokens.css.
// Warm brown, walnut, amber brass. Not the cold blue-black default.
const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Named tokens — mirror CSS custom properties
        workshop: {
          bg: "#161210",
          surface: "#1e1a17",
          text: "#dcd5cb",
          muted: "#8b8179",
          primary: "#c4935a",    // amber brass — the accent
          secondary: "#7a8c72",  // sage
          command: "#b8c4a0",    // muted green
          danger: "#c4694f",     // terracotta (VRAM hot zone)
        },
        // Back-compat shims for existing components
        bg: {
          base: "#161210",
          raised: "#1e1a17",
          card: "#1e1a17",
          border: "#2a231e",
        },
        // Three-lane pit-wall colors — all derived from workshop palette.
        // Leader glow is applied via .lane-leader (amber brass) in globals.css.
        lane: {
          a6000: "#b8c4a0",  // command green — the challenger
          a100: "#c4935a",   // amber brass — the leader accent
          h100: "#7a8c72",   // sage — the incumbent
        },
      },
      fontFamily: {
        sans: ["Space Grotesk", "system-ui", "sans-serif"],
        heading: ["Space Grotesk", "system-ui", "sans-serif"],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
