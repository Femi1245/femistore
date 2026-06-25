"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  formatLiveChatTime,
  loadLiveChatMessages,
  sendLiveChatMessage,
} from "@/lib/live-chat";
import { COMMENT_MAX_LENGTH } from "@/lib/content-limits";
import type { LiveChatMessage, Profile } from "@/lib/types";
import { Avatar } from "@/components/Avatar";

export function LiveChat({
  roomName,
  currentUser,
  hostId,
  isLive,
}: {
  roomName: string;
  currentUser: Profile;
  hostId: string;
  isLive: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamLive, setStreamLive] = useState(isLive);

  const chatOpen = streamLive;

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      const data = await loadLiveChatMessages(createClient(), roomName);
      if (!cancelled) {
        setMessages(data);
        setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [roomName]);

  useEffect(() => {
    setStreamLive(isLive);
  }, [isLive]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const supabase = createClient();

    async function refreshLiveStatus() {
      const { data } = await supabase
        .from("live_streams")
        .select("is_live")
        .eq("room_name", roomName)
        .maybeSingle();
      if (data) setStreamLive(data.is_live);
    }

    refreshLiveStatus();

    const statusChannel = supabase
      .channel(`live-status:${roomName}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "live_streams",
          filter: `room_name=eq.${roomName}`,
        },
        (payload) => {
          const row = payload.new as { is_live?: boolean };
          if (typeof row.is_live === "boolean") setStreamLive(row.is_live);
        },
      )
      .subscribe();

    const channel = supabase
      .channel(`live-chat:${roomName}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_chat_messages",
          filter: `room_name=eq.${roomName}`,
        },
        async (payload) => {
          const incoming = payload.new as LiveChatMessage;

          let author: Profile | undefined;
          if (incoming.user_id === currentUser.id) {
            author = currentUser;
          } else {
            const { data } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", incoming.user_id)
              .maybeSingle();
            author = (data as Profile | null) ?? undefined;
          }

          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, { ...incoming, author }];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(channel);
    };
  }, [roomName, currentUser]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !chatOpen || sending) return;

    setSending(true);
    setError(null);

    const { message, error: sendError } = await sendLiveChatMessage(
      createClient(),
      roomName,
      currentUser.id,
      draft,
    );

    setSending(false);

    if (sendError) {
      setError(sendError);
      return;
    }

    if (message) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, { ...message, author: currentUser }];
      });
      setDraft("");
    }
  }

  return (
    <div className="vintage-card flex h-[420px] flex-col overflow-hidden lg:h-[520px]">
      <div className="flex items-center gap-2 border-b border-vintage-border px-4 py-3">
        <MessageCircle className="h-4 w-4 text-vintage-rust" />
        <h2 className="font-display text-sm font-bold text-vintage-ink">Live chat</h2>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-vintage-rust" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-vintage-ink-muted">
            No messages yet. Say hello to everyone watching!
          </p>
        ) : (
          messages.map((msg) => {
            const isHost = msg.user_id === hostId;
            const isMe = msg.user_id === currentUser.id;
            const name = msg.author?.display_name ?? "Viewer";

            return (
              <div
                key={msg.id}
                className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}
              >
                <Avatar
                  name={name}
                  avatarUrl={msg.author?.avatar_url}
                  size="sm"
                />
                <div className={`max-w-[80%] ${isMe ? "text-right" : ""}`}>
                  <div
                    className={`mb-0.5 flex items-center gap-1.5 text-[10px] text-vintage-ink-muted ${
                      isMe ? "justify-end" : ""
                    }`}
                  >
                    <span className="font-semibold text-vintage-ink">{name}</span>
                    {isHost && (
                      <span className="rounded-sm bg-vintage-rust px-1 py-0.5 text-[9px] font-bold uppercase text-[var(--vintage-btn-text)]">
                        Host
                      </span>
                    )}
                    <span>{formatLiveChatTime(msg.created_at)}</span>
                  </div>
                  <p
                    className={`inline-block whitespace-pre-wrap break-words rounded-sm px-3 py-2 text-sm leading-relaxed ${
                      isMe
                        ? "bg-vintage-rust text-[var(--vintage-btn-text)]"
                        : "vintage-card-inset text-vintage-ink"
                    }`}
                  >
                    {msg.content}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {chatOpen ? (
        <form
          onSubmit={handleSubmit}
          className="space-y-1 border-t border-vintage-border p-3"
        >
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, COMMENT_MAX_LENGTH))}
              placeholder="Chat with everyone watching…"
              maxLength={COMMENT_MAX_LENGTH}
              className="vintage-input min-w-0 flex-1 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="vintage-btn flex shrink-0 items-center gap-1 px-3 py-2 disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="text-right text-xs text-vintage-ink-muted">
            {draft.length}/{COMMENT_MAX_LENGTH}
          </p>
        </form>
      ) : (
        <div className="border-t border-vintage-border p-3 text-center text-xs text-vintage-ink-muted">
          Chat closed — stream has ended
        </div>
      )}

      {error && (
        <p className="border-t border-vintage-border px-3 py-2 text-xs text-vintage-rust">
          {error}
        </p>
      )}
    </div>
  );
}
