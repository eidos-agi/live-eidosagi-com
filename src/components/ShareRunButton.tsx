"use client";

import { useState } from "react";

interface Props {
  runId: string;
  /** Canonical URL for the run page — used in the tweet intent. */
  runUrl: string;
  /** Optional short headline to seed the tweet. */
  tweetText?: string;
}

/**
 * "Share card" button. Copies the image URL to clipboard, opens the card
 * in a new tab, and surfaces a tweet-intent link.
 */
export default function ShareRunButton({ runId, runUrl, tweetText }: Props) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const cardUrl = `/api/share/${encodeURIComponent(runId)}`;

  async function onShare() {
    const absoluteCard =
      typeof window !== "undefined"
        ? `${window.location.origin}${cardUrl}`
        : cardUrl;

    try {
      await navigator.clipboard.writeText(absoluteCard);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
    window.open(cardUrl, "_blank", "noopener,noreferrer");
    setTimeout(() => setStatus("idle"), 2500);
  }

  const tweet =
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      tweetText ?? `We put models in the fire. ${runId}`,
    )}&url=${encodeURIComponent(runUrl)}`;

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onShare}
        className="inline-flex items-center gap-2 rounded border border-workshop-primary/40 bg-workshop-primary/10 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-workshop-primary transition-colors hover:bg-workshop-primary/20"
      >
        <span aria-hidden>◱</span>
        Share card
      </button>
      <a
        href={tweet}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-xs uppercase tracking-wider text-workshop-muted hover:text-workshop-primary"
      >
        tweet →
      </a>
      {status === "copied" && (
        <span className="font-mono text-xs text-workshop-command">
          card url copied
        </span>
      )}
      {status === "failed" && (
        <span className="font-mono text-xs text-workshop-danger">
          copy blocked — card still opened
        </span>
      )}
    </div>
  );
}
