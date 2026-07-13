"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  formatLiveChatTime,
  loadLiveChatMessages,
  sendLiveChatMessage,
} from "@/lib/live-chat";
import { getPersonalProfileUrl } from "@/lib/business";
import { COMMENT_MAX_LENGTH } from "@/lib/content-limits";
import type { LiveChatMessage, Profile } from "@/lib/types";
import { Avatar } from "@/components/Avatar";

export function LiveChat({
  roomName,
  currentUser,
  hostId,
  isLive,
  variant = "card",
}: {
  roomName: string;
  currentUser: Profile;
  hostId: string;
  isLive: boolean;
  /** TikTok-style floating messages over the video. */
  variant?: "card" | "overlay";
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamLive, setStreamLive] = useState(isLive);

  const chatOpen = streamLive;
  const overlay = variant === "overlay";

  const scrollToBottom = useCallback(() => {
    if (overlay && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
      return;
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [overlay]);

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

  const visibleMessages = overlay ? messages.slice(-40) : messages;

  const messageList = (
    <div
      ref={listRef}
      className={
        overlay
          ? "flex max-h-[38vh] flex-col justify-end gap-1.5 overflow-y-auto px-3 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          : "flex-1 space-y-3 overflow-y-auto px-3 py-3"
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-white/70" />
        </div>
      ) : visibleMessages.length === 0 ? (
        <p
          className={
            overlay
              ? "py-2 text-sm text-white/70 drop-shadow"
              : "py-8 text-center text-sm text-vintage-ink-muted"
          }
        >
          No messages yet. Say hello!
        </p>
      ) : (
        visibleMessages.map((msg) => {
          const isHostMsg = msg.user_id === hostId;
          const isMe = msg.user_id === currentUser.id;
          const name = msg.author?.display_name ?? "Viewer";
          const profileHref = msg.author?.username
            ? getPersonalProfileUrl(msg.author.username)
            : null;

          if (overlay) {
            return (
              <div key={msg.id} className="flex max-w-[85%] items-start gap-2">
                {profileHref ? (
                  <Link href={profileHref} className="shrink-0">
                    <Avatar name={name} avatarUrl={msg.author?.avatar_url} size="sm" />
                  </Link>
                ) : (
                  <Avatar name={name} avatarUrl={msg.author?.avatar_url} size="sm" />
                )}
                <div className="min-w-0 rounded-2xl bg-black/45 px-2.5 py-1.5 backdrop-blur-sm">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] leading-tight">
                    {profileHref ? (
                      <Link
                        href={profileHref}
                        className="font-semibold text-white hover:underline"
                      >
                        {name}
                      </Link>
                    ) : (
                      <span className="font-semibold text-white">{name}</span>
                    )}
                    {isHostMsg && (
                      <span className="rounded bg-red-500 px-1 py-px text-[9px] font-bold uppercase text-white">
                        Host
                      </span>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm leading-snug text-white/95">
                    {msg.content}
                  </p>
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}
            >
              <Avatar name={name} avatarUrl={msg.author?.avatar_url} size="sm" />
              <div className={`max-w-[80%] ${isMe ? "text-right" : ""}`}>
                <div
                  className={`mb-0.5 flex items-center gap-1.5 text-[10px] text-vintage-ink-muted ${
                    isMe ? "justify-end" : ""
                  }`}
                >
                  <span className="font-semibold text-vintage-ink">{name}</span>
                  {isHostMsg && (
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
      {!overlay && <div ref={bottomRef} />}
    </div>
  );

  const composer = chatOpen ? (
    <form
      onSubmit={handleSubmit}
      className={
        overlay
          ? "px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1"
          : "space-y-1 border-t border-vintage-border p-3"
      }
    >
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, COMMENT_MAX_LENGTH))}
          placeholder="Say something…"
          maxLength={COMMENT_MAX_LENGTH}
          className={
            overlay
              ? "min-w-0 flex-1 rounded-full border border-white/25 bg-black/45 px-4 py-2.5 text-sm text-white placeholder:text-white/55 backdrop-blur-md outline-none focus:border-white/50"
              : "vintage-input min-w-0 flex-1 px-3 py-2 text-sm"
          }
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className={
            overlay
              ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-500 text-white disabled:opacity-50"
              : "vintage-btn flex shrink-0 items-center gap-1 px-3 py-2 disabled:opacity-50"
          }
          aria-label="Send"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
      {error && (
        <p className={`mt-1 text-xs ${overlay ? "text-red-300" : "text-vintage-rust"}`}>
          {error}
        </p>
      )}
    </form>
  ) : (
    <div
      className={
        overlay
          ? "px-3 pb-4 text-center text-xs text-white/70"
          : "border-t border-vintage-border p-3 text-center text-xs text-vintage-ink-muted"
      }
    >
      Chat closed — stream has ended
    </div>
  );

  if (overlay) {
    return (
      <div className="flex w-full flex-col justify-end">
        {messageList}
        {composer}
      </div>
    );
  }

  return (
    <div className="vintage-card flex h-[420px] flex-col overflow-hidden lg:h-[520px]">
      <div className="flex items-center gap-2 border-b border-vintage-border px-4 py-3">
        <h2 className="font-display text-sm font-bold text-vintage-ink">Live chat</h2>
      </div>
      {messageList}
      {composer}
      {error && !chatOpen && (
        <p className="border-t border-vintage-border px-3 py-2 text-xs text-vintage-rust">
          {error}
        </p>
      )}
    </div>
  );
}
