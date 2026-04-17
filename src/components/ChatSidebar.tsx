"use client";

// Public chat sidebar.
//  - Desktop: fixed to the right edge, full height, ~320px wide.
//  - Mobile : collapsed bottom-right button; expands into a slide-up drawer.
//  - Live via SSE (/api/chat/stream); new messages append at the bottom.
//  - Sticky-scroll: auto-scroll to bottom UNLESS the user has scrolled up.
//  - Anonymous handle stored in localStorage; generated on first visit.
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
  const [handleLocked, setHandleLocked] = useState<boolean>(false);
  const [draft, setDraft] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<boolean>(false);       // mobile drawer
  const [connected, setConnected] = useState<boolean>(false);

  const listRef = useRef<HTMLDivElement | null>(null);
  const stickyRef = useRef<boolean>(true); // auto-scroll unless user scrolled up

  // Load / initialize handle from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HANDLE_KEY);
      if (stored && stored.trim()) {
        setHandle(stored);
        setHandleLocked(true);
      } else {
        setHandle(generateHandle());
      }
    } catch {
      setHandle(generateHandle());
    }
  }, []);

  // SSE subscription
  useEffect(() => {
    const es = new EventSource("/api/chat/stream");
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.type === "initial" && Array.isArray(data.messages)) {
          // server sends reverse-chron (newest first); UI wants oldest first
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

  // Sticky-scroll: if user is near the bottom, keep pinning; otherwise leave
  // them where they are.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (stickyRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

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
        if (!handleLocked) {
          try {
            localStorage.setItem(HANDLE_KEY, handle);
          } catch {
            // ignore
          }
          setHandleLocked(true);
        }
        // Don't manually append — SSE will deliver the new message, and our
        // dedupe guard prevents double-render.
      } catch {
        setError("network error");
      } finally {
        setSending(false);
      }
    },
    [draft, handle, handleLocked],
  );

  const remaining = BODY_MAX - draft.length;

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
      {/* Mobile toggle button */}
      <button
        type="button"
        aria-label="Open chat"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-40 rounded-full border border-workshop-primary/40 bg-workshop-surface px-4 py-2 font-mono text-xs uppercase tracking-wider text-workshop-primary shadow-lg lg:hidden"
      >
        {open ? "close" : "chat"}
      </button>

      {/* Sidebar — desktop fixed, mobile slide-up drawer */}
      <aside
        className={[
          "fixed right-0 z-30 flex flex-col",
          "border-l border-workshop-primary/25",
          "bg-[var(--color-surface)]/95 backdrop-blur",
          "transition-transform duration-200 ease-out",
          // Desktop: always shown, full height, right-edge
          "lg:top-0 lg:bottom-0 lg:w-[320px] lg:translate-x-0",
          // Mobile: bottom drawer, 70vh, slides up
          "bottom-0 left-0 h-[70vh] w-full",
          open ? "translate-y-0" : "translate-y-[calc(100%+1rem)]",
          "lg:translate-y-0",
        ].join(" ")}
        aria-label="Public chat"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-workshop-primary/20 px-3 py-2">
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
            className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted hover:text-workshop-primary lg:hidden"
            aria-label="Close chat"
          >
            close
          </button>
        </div>

        {/* Messages */}
        <div
          ref={listRef}
          onScroll={onScroll}
          className="flex-1 overflow-y-auto py-2"
        >
          {messages.length === 0 ? (
            <div className="px-3 py-6 font-mono text-xs text-workshop-muted">
              no messages yet — say hello.
            </div>
          ) : (
            messageList
          )}
        </div>

        {/* Composer */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-workshop-primary/20 bg-[var(--color-bg)]/30 px-3 py-2"
        >
          <div className="mb-1 flex items-center gap-2">
            <label
              htmlFor="chat-handle"
              className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted"
            >
              handle
            </label>
            <input
              id="chat-handle"
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              disabled={handleLocked}
              maxLength={32}
              className="flex-1 rounded border border-workshop-muted/20 bg-[var(--color-bg)] px-2 py-1 font-mono text-xs text-workshop-primary outline-none focus:border-workshop-primary/50 disabled:opacity-70"
            />
            {handleLocked ? (
              <button
                type="button"
                onClick={() => {
                  setHandleLocked(false);
                }}
                className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted hover:text-workshop-primary"
              >
                edit
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setHandle(generateHandle())}
                className="font-mono text-[10px] uppercase tracking-wider text-workshop-muted hover:text-workshop-primary"
              >
                roll
              </button>
            )}
          </div>
          <div className="flex items-end gap-2">
            <textarea
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
              className="flex-1 resize-none rounded border border-workshop-muted/20 bg-[var(--color-bg)] px-2 py-1.5 text-sm text-workshop-text outline-none placeholder:text-workshop-muted focus:border-workshop-primary/50"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim() || !handle.trim()}
              className="rounded border border-workshop-primary/50 bg-workshop-primary/10 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-workshop-primary transition hover:bg-workshop-primary/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sending ? "…" : "send"}
            </button>
          </div>
          <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-workshop-muted">
            <span>{error ? <span className="text-workshop-danger">{error}</span> : " "}</span>
            <span className="tnum">{remaining}</span>
          </div>
        </form>
      </aside>
    </>
  );
}
