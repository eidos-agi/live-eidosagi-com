"use client";

// Public chat.
//  - Desktop (lg+): always-open sidebar on the right, 320px wide, full height.
//    Layout reserves matching right padding in app/layout.tsx.
//  - Mobile: collapsed tab bottom-right, opens a slide-up drawer.
//  - Live via SSE; handle + roll + char count inline in the composer.
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
const MOBILE_OPEN_KEY = "eidos.chat.mobileOpen";
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
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [connected, setConnected] = useState<boolean>(false);

  const listRef = useRef<HTMLDivElement | null>(null);
  const stickyRef = useRef<boolean>(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HANDLE_KEY);
      setHandle(stored && stored.trim() ? stored : generateHandle());
      setMobileOpen(localStorage.getItem(MOBILE_OPEN_KEY) === "1");
    } catch {
      setHandle(generateHandle());
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(MOBILE_OPEN_KEY, mobileOpen ? "1" : "0");
    } catch {
      // ignore
    }
  }, [mobileOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileOpen) setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

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
  }, [messages, mobileOpen]);

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
  const viewerCount = useMemo(() => {
    // Distinct handles in the last hour of visible messages — cheap proxy for
    // "who's in the room." Purely cosmetic.
    const since = Date.now() - 60 * 60 * 1000;
    const handles = new Set<string>();
    for (const m of messages) if (m.ts >= since && !m.deleted) handles.add(m.handle);
    return handles.size;
  }, [messages]);

  const messageList = useMemo(
    () =>
      messages.map((m) => (
        <div key={m.id} className="px-4 py-2">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[11px] text-workshop-primary">
              {m.handle}
            </span>
            <span className="font-mono text-[10px] text-workshop-muted tnum">
              {formatTime(m.ts)}
            </span>
          </div>
          <div className="mt-1 break-words text-[13px] leading-relaxed text-workshop-text">
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

  const headerBar = (
    <div className="flex items-center justify-between border-b border-workshop-primary/15 bg-gradient-to-b from-[var(--color-surface)] to-[var(--color-surface)]/80 px-4 py-3">
      <div className="flex items-center gap-2">
        <span
          className={[
            "inline-block h-2 w-2 rounded-full",
            connected
              ? "bg-workshop-command shadow-[0_0_8px_rgba(184,196,160,0.6)]"
              : "bg-workshop-muted",
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
      <div className="flex items-center gap-3 font-mono text-[10px] text-workshop-muted">
        {viewerCount > 0 && (
          <span className="tnum">
            <span className="text-workshop-text">{viewerCount}</span>{" "}
            {viewerCount === 1 ? "voice" : "voices"}
          </span>
        )}
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="rounded-full border border-transparent p-1 text-workshop-muted transition hover:border-workshop-muted/30 hover:text-workshop-text lg:hidden"
          aria-label="Close chat"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path
              d="M1 1l12 12M13 1L1 13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );

  const messagesPane = (
    <div
      ref={listRef}
      onScroll={onScroll}
      className="flex-1 overflow-y-auto py-2"
    >
      {messages.length === 0 ? (
        <div className="px-4 py-10 font-mono text-[11px] leading-relaxed text-workshop-muted">
          <p className="mb-2 text-workshop-text">the fire is lit.</p>
          <p>
            watch the GPUs race. say something. pick any handle — nobody
            here knows you yet.
          </p>
        </div>
      ) : (
        messageList
      )}
    </div>
  );

  const composer = (
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
  );

  return (
    <>
      {/* Desktop: always-open right-edge sidebar */}
      <aside
        className="fixed right-0 top-0 bottom-0 z-30 hidden w-[320px] flex-col border-l border-workshop-primary/20 bg-[var(--color-surface)]/95 backdrop-blur lg:flex"
        aria-label="Public chat"
      >
        {headerBar}
        {messagesPane}
        {composer}
      </aside>

      {/* Mobile: collapsed tab */}
      {!mobileOpen && (
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open chat"
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border border-workshop-primary/40 bg-[var(--color-surface)]/95 px-4 py-2 shadow-[0_2px_20px_rgba(196,147,90,0.1)] backdrop-blur lg:hidden"
        >
          <span
            className={[
              "inline-block h-1.5 w-1.5 rounded-full",
              connected ? "bg-workshop-command animate-pulse" : "bg-workshop-muted",
            ].join(" ")}
            aria-hidden
          />
          <span className="font-mono text-[11px] uppercase tracking-wider text-workshop-primary">
            chat
          </span>
        </button>
      )}

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside
            role="dialog"
            aria-label="Public chat"
            className="fixed bottom-0 left-0 right-0 z-40 flex h-[80vh] flex-col rounded-t-2xl border-t border-workshop-primary/30 bg-[var(--color-surface)]/97 backdrop-blur lg:hidden"
          >
            {headerBar}
            {messagesPane}
            {composer}
          </aside>
        </>
      )}
    </>
  );
}
