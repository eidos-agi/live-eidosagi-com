"use client";

// Public chat — collapsed-by-default tab at right edge. Click to expand into
// a right-anchored drawer. Sits on top of content; does NOT take layout width.
//
//  - Tab shows live connection + message count.
//  - Drawer: 360px wide, 85vh tall, max 720px tall.
//  - Handle lives in localStorage; shown inline in the composer, not as a
//    separate picker step.
//  - 200-char limit per message. Rate limit enforced server-side (1/5s/IP).
//  - Soft-deleted messages render as [removed].
//  - User-posted links get rel="nofollow noopener", no image embedding.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

interface ChatMessage {
  id: number;
  ts: number;
  handle: string;
  body: string;
  deleted: boolean;
}

const HANDLE_KEY = "eidos.chat.handle";
const OPEN_KEY = "eidos.chat.open";
const SEEN_KEY = "eidos.chat.lastSeenId";
const BODY_MAX = 200;

// ---- handle generator -------------------------------------------------------

const ADJECTIVES = [
  "ember", "ashen", "forge", "quench", "rivet", "anvil", "spark",
  "molten", "kiln", "smelt", "temper", "crucible", "ingot", "slag",
  "bellows", "hearth", "lathe",
];
const METALS = [
  "tungsten", "copper", "brass", "iron", "steel", "bronze", "cobalt",
  "nickel", "tin", "zinc", "lead", "chromium", "titanium", "aluminum",
  "silicon", "carbon",
];

function generateHandle(): string {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const m = METALS[Math.floor(Math.random() * METALS.length)];
  return `${a}-${m}`;
}

// ---- safe rendering (nofollow links, no images) -----------------------------

const URL_PATTERN = /https?:\/\/[^\s<>]+/gi;

function renderBody(body: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIdx = 0;
  let key = 0;
  for (const m of body.matchAll(URL_PATTERN)) {
    const idx = m.index ?? 0;
    const href = m[0];
    if (idx > lastIdx) parts.push(body.slice(lastIdx, idx));
    parts.push(
      <a
        key={`l${key++}`}
        href={href}
        target="_blank"
        rel="nofollow noopener noreferrer"
        className="text-workshop-primary underline decoration-dotted underline-offset-2 hover:no-underline break-all"
      >
        {href}
      </a>,
    );
    lastIdx = idx + href.length;
  }
  if (lastIdx < body.length) parts.push(body.slice(lastIdx));
  return parts;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

// ---- component --------------------------------------------------------------

export default function ChatSidebar() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [handle, setHandle] = useState<string>("");
  const [draft, setDraft] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<boolean>(false);
  const [connected, setConnected] = useState<boolean>(false);
  const [lastSeenId, setLastSeenId] = useState<number>(0);

  const listRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const stickyRef = useRef<boolean>(true);

  // Load handle + open state + last seen id from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HANDLE_KEY);
      setHandle(stored && stored.trim() ? stored : generateHandle());
      setOpen(localStorage.getItem(OPEN_KEY) === "1");
      const seen = parseInt(localStorage.getItem(SEEN_KEY) ?? "0", 10);
      if (!Number.isNaN(seen)) setLastSeenId(seen);
    } catch {
      setHandle(generateHandle());
    }
  }, []);

  // Persist open state
  useEffect(() => {
    try {
      localStorage.setItem(OPEN_KEY, open ? "1" : "0");
    } catch {
      // ignore
    }
    if (open && textareaRef.current) {
      // Focus composer after opening
      setTimeout(() => textareaRef.current?.focus(), 120);
    }
  }, [open]);

  // Mark seen while open
  useEffect(() => {
    if (!open || messages.length === 0) return;
    const latest = messages[messages.length - 1]?.id ?? 0;
    if (latest > lastSeenId) {
      setLastSeenId(latest);
      try {
        localStorage.setItem(SEEN_KEY, String(latest));
      } catch {
        // ignore
      }
    }
  }, [open, messages, lastSeenId]);

  // Keyboard: ESC closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // SSE subscription
  useEffect(() => {
    const es = new EventSource("/api/chat/stream");
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.type === "initial" && Array.isArray(data.messages)) {
          const asc = [...(data.messages as ChatMessage[])].sort(
            (a, b) => a.ts - b.ts,
          );
          setMessages(asc);
        } else if (data.type === "message" && data.message) {
          const m = data.message as ChatMessage;
          setMessages((prev) => {
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, m];
          });
        }
      } catch {
        // ignore malformed payloads
      }
    };
    return () => {
      es.close();
    };
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (stickyRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  const onScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const nearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    stickyRef.current = nearBottom;
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(null);
      const body = draft.trim();
      if (!body) return;
      if (!handle.trim()) {
        setError("pick a handle first");
        return;
      }
      setSending(true);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ handle, body }),
        });
        if (res.status === 429) {
          const data = (await res.json().catch(() => ({}))) as {
            retry_after_ms?: number;
          };
          const secs = Math.ceil((data.retry_after_ms ?? 5000) / 1000);
          setError(`slow down — wait ${secs}s`);
          return;
        }
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          setError(data.error ?? "send_failed");
          return;
        }
        setDraft("");
        try {
          localStorage.setItem(HANDLE_KEY, handle);
        } catch {
          // ignore
        }
      } catch {
        setError("network error");
      } finally {
        setSending(false);
      }
    },
    [draft, handle],
  );

  const remaining = BODY_MAX - draft.length;

  const unreadCount = useMemo(
    () => messages.filter((m) => m.id > lastSeenId && !m.deleted).length,
    [messages, lastSeenId],
  );

  const latestPreview = useMemo(() => {
    const last = [...messages].reverse().find((m) => !m.deleted);
    if (!last) return null;
    const body = last.body.length > 40 ? last.body.slice(0, 40) + "…" : last.body;
    return `${last.handle}: ${body}`;
  }, [messages]);

  const messageList = useMemo(
    () =>
      messages.map((m) => (
        <div key={m.id} className="px-3 py-1.5">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[11px] text-workshop-primary">
              {m.handle}
            </span>
            <span className="font-mono text-[10px] text-workshop-muted tnum">
              {formatTime(m.ts)}
            </span>
          </div>
          <div className="mt-0.5 break-words text-sm text-workshop-text">
            {m.deleted ? (
              <em className="text-workshop-muted">[removed]</em>
            ) : (
              renderBody(m.body)
            )}
          </div>
        </div>
      )),
    [messages],
  );

  // ---- render ---------------------------------------------------------------

  return (
    <>
      {/* Collapsed tab (visible when closed) */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open chat"
          className="fixed bottom-5 right-5 z-40 flex max-w-[calc(100vw-2.5rem)] items-center gap-2 rounded-full border border-workshop-primary/40 bg-[var(--color-surface)]/95 px-4 py-2 text-left shadow-[0_2px_20px_rgba(196,147,90,0.08)] backdrop-blur transition hover:border-workshop-primary/70 hover:shadow-[0_2px_28px_rgba(196,147,90,0.18)]"
        >
          <span
            className={[
              "inline-block h-1.5 w-1.5 rounded-full",
              connected ? "bg-workshop-command animate-pulse" : "bg-workshop-muted",
            ].join(" ")}
            aria-hidden
          />
          <span className="font-mono text-[11px] uppercase tracking-wider text-workshop-muted">
            chat
          </span>
          {latestPreview ? (
            <span className="hidden truncate font-mono text-[11px] text-workshop-text sm:inline-block sm:max-w-[240px]">
              {latestPreview}
            </span>
          ) : null}
          {unreadCount > 0 && (
            <span className="rounded-full bg-workshop-primary px-1.5 py-0.5 font-mono text-[10px] font-semibold text-workshop-bg tnum">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Backdrop (mobile + small viewports) */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Drawer */}
      {open && (
        <aside
          role="dialog"
          aria-label="Public chat"
          className={[
            "fixed right-4 z-40 flex flex-col overflow-hidden",
            "rounded-2xl border border-workshop-primary/30",
            "bg-[var(--color-surface)]/97 backdrop-blur",
            "shadow-[0_10px_40px_rgba(0,0,0,0.5)]",
            // Desktop: bottom-right floating panel
            "bottom-5 h-[min(85vh,720px)] w-[min(calc(100vw-2rem),380px)]",
          ].join(" ")}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-workshop-primary/15 px-4 py-3">
            <div className="flex items-center gap-2">
              <span
                className={[
                  "inline-block h-1.5 w-1.5 rounded-full",
                  connected ? "bg-workshop-command" : "bg-workshop-muted",
                ].join(" ")}
                aria-hidden
              />
              <span className="font-heading text-sm font-semibold text-workshop-text">
                chat
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted">
                {connected ? "live" : "reconnecting"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-transparent p-1 text-workshop-muted transition hover:border-workshop-muted/30 hover:text-workshop-text"
              aria-label="Close chat"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden
              >
                <path
                  d="M1 1l12 12M13 1L1 13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div
            ref={listRef}
            onScroll={onScroll}
            className="flex-1 overflow-y-auto py-2"
          >
            {messages.length === 0 ? (
              <div className="px-4 py-8 font-mono text-xs leading-relaxed text-workshop-muted">
                say something while you watch the fire.
              </div>
            ) : (
              messageList
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={handleSubmit}
            className="border-t border-workshop-primary/15 bg-[var(--color-bg)]/40 px-3 py-3"
          >
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2 font-mono text-[10px] text-workshop-muted">
                  <span className="text-workshop-primary">{handle}</span>
                  <button
                    type="button"
                    onClick={() => setHandle(generateHandle())}
                    className="text-[10px] uppercase tracking-wider text-workshop-muted hover:text-workshop-primary"
                    aria-label="Roll new handle"
                  >
                    roll
                  </button>
                  <span className="ml-auto tnum">{remaining}</span>
                </div>
                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value.slice(0, BODY_MAX))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      (e.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
                    }
                  }}
                  placeholder="say something…"
                  rows={2}
                  maxLength={BODY_MAX}
                  className="w-full resize-none rounded-lg border border-workshop-muted/20 bg-[var(--color-bg)] px-3 py-2 text-sm text-workshop-text outline-none placeholder:text-workshop-muted focus:border-workshop-primary/50"
                />
              </div>
              <button
                type="submit"
                disabled={sending || !draft.trim() || !handle.trim()}
                className="h-[54px] rounded-lg border border-workshop-primary/50 bg-workshop-primary/10 px-3 font-mono text-xs uppercase tracking-wider text-workshop-primary transition hover:bg-workshop-primary/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {sending ? "…" : "send"}
              </button>
            </div>
            {error && (
              <div className="mt-2 font-mono text-[10px] text-workshop-danger">
                {error}
              </div>
            )}
          </form>
        </aside>
      )}
    </>
  );
}
