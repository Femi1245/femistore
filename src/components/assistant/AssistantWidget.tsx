"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot, MessageCircle, Send, X } from "lucide-react";
import type { ChatTurn } from "@/lib/assistant";
import { ASSISTANT_DISPLAY_NAME } from "@/lib/assistant";

const STORAGE_KEY = "zumelia-assistant-widget-history";

function loadGuestHistory(): ChatTurn[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatTurn[];
    return Array.isArray(parsed) ? parsed.slice(-20) : [];
  } catch {
    return [];
  }
}

function saveGuestHistory(history: ChatTurn[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-20)));
  } catch {
    // ignore quota errors
  }
}

type WidgetMessage = ChatTurn & { id: string };

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(
      loadGuestHistory().map((m, i) => ({
        ...m,
        id: `guest-${i}-${m.content.slice(0, 8)}`,
      })),
    );
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, sending]);

  useEffect(() => {
    if (!open) return;
    fetch("/api/assistant/conversation", { method: "POST" })
      .then(async (res) => {
        if (res.ok) {
          const data = (await res.json()) as { convId: string };
          setIsLoggedIn(true);
          setConversationId(data.convId);
        } else {
          setIsLoggedIn(false);
        }
      })
      .catch(() => setIsLoggedIn(false));
  }, [open]);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    setError(null);
    setDraft("");

    const userMsg: WidgetMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const guestHistory = messages.map(({ role, content }) => ({ role, content }));
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationId: conversationId ?? undefined,
          history: isLoggedIn ? undefined : guestHistory,
        }),
      });

      const data = (await res.json()) as {
        reply?: string;
        error?: string;
        conversationId?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Could not reach assistant.");
      }

      if (data.conversationId) setConversationId(data.conversationId);

      const assistantMsg: WidgetMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: data.reply ?? "…",
      };

      setMessages((prev) => {
        const next = [...prev, assistantMsg];
        if (!isLoggedIn) {
          saveGuestHistory(next.map(({ role, content }) => ({ role, content })));
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setDraft(text);
    } finally {
      setSending(false);
    }
  }, [draft, sending, messages, conversationId, isLoggedIn]);

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-vintage-rust text-[#fff8f0] shadow-lg transition hover:scale-105 md:bottom-6"
          aria-label="Open Zumelia AI assistant"
        >
          <Bot className="h-7 w-7" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-[60] flex h-[min(32rem,70vh)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-vintage-border bg-vintage-paper shadow-2xl md:bottom-6">
          <header className="flex items-center justify-between border-b border-vintage-border bg-vintage-rust/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-vintage-rust text-[#fff8f0]">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-vintage-ink">{ASSISTANT_DISPLAY_NAME}</p>
                <p className="text-[11px] text-vintage-ink-muted">Ask anything</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-vintage-ink-muted hover:bg-vintage-paper-dark"
              aria-label="Close assistant"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <p className="text-sm text-vintage-ink-muted">
                Hi! I can help with Zumelia, your business profile, ideas, or everyday questions.
              </p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-vintage-rust text-[#fff8f0]"
                      : "vintage-card-inset text-vintage-ink"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <p className="text-xs text-vintage-ink-muted">Zumelia AI is thinking…</p>
            )}
            <div ref={bottomRef} />
          </div>

          {error && (
            <p className="border-t border-vintage-border bg-vintage-rust/10 px-4 py-2 text-xs text-vintage-rust">
              {error}
            </p>
          )}

          <form
            className="border-t border-vintage-border p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <div className="flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask Zumelia AI…"
                className="vintage-input min-w-0 flex-1 px-3 py-2 text-sm"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="vintage-btn flex items-center justify-center px-3 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            {isLoggedIn && (
              <Link
                href="/chat"
                className="mt-2 flex items-center gap-1 text-xs font-medium text-vintage-rust hover:underline"
              >
                <MessageCircle className="h-3.5 w-3.5" /> Open full chat
              </Link>
            )}
          </form>
        </div>
      )}
    </>
  );
}
