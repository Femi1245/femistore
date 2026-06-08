"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Globe,
  Home,
  MessageCircle,
  Search,
  Send,
  User,
  Users,
} from "lucide-react";
import { AppNav } from "@/components/layout/AppNav";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { createClient } from "@/lib/supabase/client";
import {
  findOrCreateConversation,
  formatMessageTime,
  loadConversations,
} from "@/lib/chat";
import type { ConversationPreview, Message, Profile } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
type Tab = "chats" | "discover";

export function ChatApp({
  currentUser,
}: {
  currentUser: Profile;
}) {
  const getSupabase = useCallback(() => createClient(), []);

  const [tab, setTab] = useState<Tab>("chats");
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeOther, setActiveOther] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [discoverUsers, setDiscoverUsers] = useState<Profile[]>([]);
  const [countryFilter, setCountryFilter] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const refreshConversations = useCallback(async () => {
    const list = await loadConversations(getSupabase(), currentUser.id);
    setConversations(list);
  }, [getSupabase, currentUser.id]);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  useEffect(() => {
    async function loadDiscover() {
      const supabase = getSupabase();
      let query = supabase
        .from("profiles")
        .select("*")
        .neq("id", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (countryFilter) {
        query = query.eq("country", countryFilter);
      }

      if (search.trim()) {
        query = query.or(
          `display_name.ilike.%${search}%,username.ilike.%${search}%,country.ilike.%${search}%`,
        );
      }

      const { data } = await query;
      setDiscoverUsers((data as Profile[]) ?? []);
    }

    if (tab === "discover") {
      loadDiscover();
    }
  }, [tab, search, countryFilter, getSupabase, currentUser.id]);

  const loadMessages = useCallback(
    async (convId: string) => {
      setLoadingMsgs(true);
      const { data } = await getSupabase()
        .from("messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });

      setMessages((data as Message[]) ?? []);
      setLoadingMsgs(false);
    },
    [getSupabase],
  );

  useEffect(() => {
    if (!activeConvId) return;

    loadMessages(activeConvId);

    const supabase = getSupabase();
    const channel = supabase
      .channel(`messages:${activeConvId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConvId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          refreshConversations();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConvId, getSupabase, loadMessages, refreshConversations]);

  async function openConversation(other: Profile, convId?: string) {
    setChatError(null);

    if (!convId) {
      const { convId: createdId, error } = await findOrCreateConversation(
        getSupabase(),
        currentUser.id,
        other.id,
      );
      if (error) {
        setChatError(error);
        return;
      }
      if (!createdId) return;
      convId = createdId;
    }

    setActiveConvId(convId);
    setActiveOther(other);
    setTab("chats");
    await loadMessages(convId);
    await refreshConversations();
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !activeConvId || sending) return;

    setSending(true);
    setChatError(null);
    const content = draft.trim();
    setDraft("");

    const { data, error } = await getSupabase()
      .from("messages")
      .insert({
        conversation_id: activeConvId,
        sender_id: currentUser.id,
        content,
      })
      .select()
      .single();

    if (error) {
      setChatError(
        error.message.includes("row-level security")
          ? "You can only message friends. Both of you must connect (follow each other)."
          : error.message,
      );
      setDraft(content);
      setSending(false);
      return;
    }

    if (data) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data as Message];
      });
      await refreshConversations();
    }

    setSending(false);
  }

  const countriesInDiscover = [
    ...new Set(discoverUsers.map((u) => u.country)),
  ].sort();

  return (
    <div className="vintage-page flex h-screen flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] text-vintage-ink md:pb-0">
      <AppNav user={currentUser} />
      <div className="flex flex-1 min-h-0 flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="flex w-full flex-col border-r-2 border-vintage-border bg-vintage-paper md:w-80 lg:w-96">
        <div className="border-b-2 border-vintage-border p-3">
          <div className="mb-2 flex items-center gap-2 vintage-card-inset px-3 py-2">
            <Link href={`/profile/${currentUser.username}`}>
              <Avatar
                name={currentUser.display_name}
                avatarUrl={currentUser.avatar_url}
                size="sm"
              />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{currentUser.display_name}</p>
              <p className="truncate text-xs text-vintage-ink-muted">
                @{currentUser.username} · {currentUser.country}
              </p>
            </div>
          </div>

          <div className="mb-2 flex gap-1">
            <Link
              href="/feed"
              className="flex flex-1 items-center justify-center gap-1 rounded-sm vintage-card-inset py-2 text-xs text-vintage-ink-muted hover:text-vintage-ink"
            >
              <Home className="h-3.5 w-3.5" /> Feed
            </Link>
            <Link
              href={`/profile/${currentUser.username}`}
              className="flex flex-1 items-center justify-center gap-1 rounded-sm vintage-card-inset py-2 text-xs text-vintage-ink-muted hover:text-vintage-ink"
            >
              <User className="h-3.5 w-3.5" /> Profile
            </Link>
          </div>

          <div className="flex gap-1 vintage-card-inset p-1">
            <button
              onClick={() => setTab("chats")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition ${
                tab === "chats"
                  ? "bg-vintage-rust text-[#fff8f0]"
                  : "text-vintage-ink-muted hover:text-vintage-ink"
              }`}
            >
              <MessageCircle className="h-4 w-4" />
              Chats
            </button>
            <button
              onClick={() => setTab("discover")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition ${
                tab === "discover"
                  ? "bg-vintage-rust text-[#fff8f0]"
                  : "text-vintage-ink-muted hover:text-vintage-ink"
              }`}
            >
              <Globe className="h-4 w-4" />
              Discover
            </button>
          </div>
        </div>

        {chatError ? (
          <p className="border-b border-vintage-border bg-vintage-rust/10 px-4 py-2 text-xs text-vintage-rust">
            {chatError}
          </p>
        ) : null}

        {tab === "chats" ? (
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                <Users className="h-10 w-10 text-vintage-border" />
                <p className="text-sm text-vintage-ink-muted">
                  No conversations yet. Discover people worldwide and start chatting.
                </p>
                <button
                  onClick={() => setTab("discover")}
                  className="vintage-btn-outline px-4 py-2 text-sm"
                >
                  Discover people
                </button>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => openConversation(conv.other_user, conv.id)}
                  className={`flex w-full items-center gap-3 border-b border-vintage-border/40 px-4 py-3 text-left transition hover:bg-vintage-paper-dark/50 ${
                    activeConvId === conv.id ? "bg-vintage-rust/10" : ""
                  }`}
                >
                  <Avatar
                    name={conv.other_user.display_name}
                    avatarUrl={conv.other_user.avatar_url}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-medium">{conv.other_user.display_name}</p>
                      {conv.last_message_at && (
                        <span className="shrink-0 text-xs text-vintage-ink-muted">
                          {formatMessageTime(conv.last_message_at)}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-vintage-ink-muted">
                      {conv.other_user.country}
                      {conv.last_message ? ` · ${conv.last_message}` : ""}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        ) : (
          <>
            <div className="space-y-2 border-b-2 border-vintage-border p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-vintage-rust" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, username, country…"
                  className="vintage-input w-full py-2.5 pl-10 pr-4 text-sm"
                />
              </div>
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="vintage-input w-full px-3 py-2 text-sm"
              >
                <option value="">All countries</option>
                {countriesInDiscover.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <p className="text-xs text-vintage-ink-muted">
                Message people after you both connect (follow each other).
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {discoverUsers.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-vintage-ink-muted">
                  No users found. Try another search or sign up friends.
                </p>
              ) : (
                discoverUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-2 border-b border-vintage-border/40 px-4 py-3"
                  >
                    <Link
                      href={`/profile/${user.username}`}
                      className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-80"
                    >
                      <Avatar
                        name={user.display_name}
                        avatarUrl={user.avatar_url}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{user.display_name}</p>
                        <p className="truncate text-xs text-vintage-ink-muted">
                          @{user.username} · {user.country}
                        </p>
                      </div>
                    </Link>
                    <button
                      onClick={() => openConversation(user)}
                      className="vintage-btn shrink-0 px-2 py-1 text-xs"
                    >
                      Chat
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </aside>

      {/* Main chat area */}
      <main className="flex flex-1 flex-col min-h-0">
        {activeOther && activeConvId ? (
          <>
            <header className="flex items-center gap-3 border-b-2 border-vintage-border bg-vintage-paper px-4 py-3">
              <Link href={`/profile/${activeOther.username}`} className="flex items-center gap-3">
              <Avatar
                name={activeOther.display_name}
                avatarUrl={activeOther.avatar_url}
              />
              <div>
                <p className="font-semibold hover:text-vintage-rust">{activeOther.display_name}</p>
                <p className="text-xs text-vintage-ink-muted">
                  @{activeOther.username} · {activeOther.country}
                </p>
              </div>
              </Link>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {loadingMsgs ? (
                <p className="text-center text-sm text-vintage-ink-muted">Loading messages…</p>
              ) : messages.length === 0 ? (
                <p className="text-center text-sm text-vintage-ink-muted py-8">
                  Say hello — you&apos;re connected across the globe on iTunes.
                </p>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender_id === currentUser.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                          isMine
                            ? "rounded-br-sm vintage-btn text-[#fff8f0]"
                            : "rounded-bl-sm vintage-card-inset text-vintage-ink"
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                        <p
                          className={`mt-1 text-[10px] ${
                            isMine ? "text-[#fff8f0]/70" : "text-vintage-ink-muted"
                          }`}
                        >
                          {formatMessageTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {chatError ? (
              <p className="border-t border-vintage-border px-4 py-2 text-xs text-vintage-rust">
                {chatError}
              </p>
            ) : null}

            <form
              onSubmit={sendMessage}
              className="flex gap-2 border-t-2 border-vintage-border bg-vintage-paper p-4"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message…"
                className="vintage-input flex-1 px-4 py-3"
              />
              <button
                type="submit"
                disabled={!draft.trim() || sending}
                className="vintage-btn flex h-12 w-12 items-center justify-center disabled:opacity-40"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center vintage-card">
              <Globe className="h-10 w-10 text-vintage-rust" />
            </div>
            <h2 className="font-display text-xl font-semibold">Connect globally on iTunes</h2>
            <p className="max-w-sm text-sm text-vintage-ink-muted">
              Pick a conversation or discover people from around the world to start
              chatting in real time.
            </p>
            <button
              onClick={() => setTab("discover")}
              className="vintage-btn px-6 py-2.5 text-sm"
            >
              Discover people
            </button>
          </div>
        )}
      </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
