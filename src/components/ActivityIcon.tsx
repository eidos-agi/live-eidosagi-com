// 14x14 inline SVGs for activity feed chips.
// Lucide-style: 1.5px stroke, currentColor, no fill unless filled-variant.

import type { ReactNode, SVGProps } from "react";

type IconName =
  | "commit"
  | "branch"
  | "pr"
  | "merge"
  | "flame"
  | "rocket"
  | "check"
  | "gear"
  | "warn"
  | "search"
  | "chat"
  | "chip"
  | "diamond"
  | "user"
  | "bell"
  | "dot"
  | "bolt";

const COMMON: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 16 16",
  width: 14,
  height: 14,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

function paths(name: IconName): ReactNode {
  switch (name) {
    case "commit":
      return (
        <>
          <circle cx="8" cy="8" r="2.75" fill="currentColor" stroke="none" />
          <path d="M8 1.5v2.25M8 12.25V14.5" />
        </>
      );
    case "branch":
      return (
        <>
          <circle cx="4" cy="3.5" r="1.5" />
          <circle cx="4" cy="12.5" r="1.5" />
          <circle cx="12" cy="6" r="1.5" />
          <path d="M4 5v6M4 9c0-2.5 2.5-3 4-3.5" />
        </>
      );
    case "pr":
      return (
        <>
          <circle cx="4" cy="3.5" r="1.5" />
          <circle cx="4" cy="12.5" r="1.5" />
          <circle cx="12" cy="12.5" r="1.5" />
          <path d="M4 5v6M10.5 12.5H7M12 5.25V11" />
          <path d="M10.25 3.75L12 2L13.75 3.75" />
        </>
      );
    case "merge":
      return (
        <>
          <circle cx="4" cy="3.5" r="1.5" />
          <circle cx="4" cy="12.5" r="1.5" />
          <circle cx="12" cy="8" r="1.5" />
          <path d="M4 5v6M4 9c0-2 2-3 4-3.5" />
          <path d="M10.5 8H6.5" />
        </>
      );
    case "flame":
      return (
        <path d="M8 14.5c-2.75 0-4.5-1.8-4.5-4 0-1.4.9-2.4 1.7-3.1.7-.6 1.3-1.1 1.3-2 0-.8-.5-1.7-1-2.4 2 .4 3.8 1.8 4.2 3.4.2-.4.7-.9 1.3-1.2-.2 1.3.6 2.1 1.2 2.8.7.8 1.3 1.7 1.3 2.6 0 2-1.7 3.9-5.5 3.9Z" />
      );
    case "rocket":
      return (
        <>
          <path d="M11 2.5c0 2.5-1.5 5-3 6.5L5 12l-1.5-1.5L7 7c1.5-1.5 4-3 6-4.5Z" />
          <path d="M5.5 10.5L3 13l2.5-.5L5.5 10.5Z" />
          <circle cx="9.5" cy="5.5" r="0.8" fill="currentColor" stroke="none" />
        </>
      );
    case "check":
      return <path d="M3 8.5l3.2 3.2L13 4.5" />;
    case "gear":
      return (
        <>
          <circle cx="8" cy="8" r="2" />
          <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6L13 13M13 3l-1.4 1.4M4.4 11.6L3 13" />
        </>
      );
    case "warn":
      return (
        <>
          <path d="M8 2L15 13.5H1L8 2Z" />
          <path d="M8 6.5v3" />
          <circle cx="8" cy="11.5" r="0.6" fill="currentColor" stroke="none" />
        </>
      );
    case "search":
      return (
        <>
          <circle cx="7" cy="7" r="4" />
          <path d="M10 10l3 3" />
        </>
      );
    case "chat":
      return (
        <path d="M3 3h10v7.5H7l-3 2.5v-2.5H3V3Z" />
      );
    case "chip":
      return (
        <>
          <rect x="4" y="4" width="8" height="8" rx="0.5" />
          <path d="M6.5 7h3M6.5 9h3M2 6h2M2 8h2M2 10h2M12 6h2M12 8h2M12 10h2M6 2v2M8 2v2M10 2v2M6 12v2M8 12v2M10 12v2" />
        </>
      );
    case "diamond":
      return (
        <path d="M8 2L14 8L8 14L2 8L8 2Z" />
      );
    case "user":
      return (
        <>
          <circle cx="8" cy="6" r="2.5" />
          <path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5" />
        </>
      );
    case "bell":
      return (
        <>
          <path d="M4 11.5V7.5a4 4 0 0 1 8 0v4L13 13H3l1-1.5Z" />
          <path d="M7 14h2" />
        </>
      );
    case "bolt":
      return (
        <path d="M9.5 2L3.5 9.5h4L6.5 14L12.5 6.5h-4L9.5 2Z" />
      );
    case "dot":
    default:
      return <circle cx="8" cy="8" r="2.5" fill="currentColor" stroke="none" />;
  }
}

interface Props {
  name?: string | null;
  kind?: string;
}

export default function ActivityIcon({ name, kind }: Props) {
  // Map the string icon name (stored in DB) or the event kind to a glyph.
  const n = resolveIcon(name, kind);
  return <svg {...COMMON}>{paths(n)}</svg>;
}

function resolveIcon(name?: string | null, kind?: string): IconName {
  const m: Record<string, IconName> = {
    "git-branch": "branch",
    "git-commit": "commit",
    "git-pull-request": "pr",
    "git-merge": "merge",
    flame: "flame",
    rocket: "rocket",
    check: "check",
    gear: "gear",
    warn: "warn",
    search: "search",
    chat: "chat",
    chip: "chip",
    diamond: "diamond",
    user: "user",
    bell: "bell",
    bolt: "bolt",
  };
  if (name && m[name]) return m[name];
  if (kind) {
    const kindMap: Record<string, IconName> = {
      commit: "commit",
      pr: "pr",
      milestone: "flame",
      decision: "diamond",
      action: "bolt",
      observation: "search",
    };
    if (kindMap[kind]) return kindMap[kind];
  }
  return "dot";
}
