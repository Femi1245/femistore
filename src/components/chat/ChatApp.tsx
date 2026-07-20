"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  Globe,
  Hash,
  Home,
  Megaphone,
  MessageCircle,
  Phone,
  PhoneCall,
  Plus,
  Search,
  Send,
  User,
  UserPlus,
  Users,
  Video,
  Lock,
  Gift,
  Palette,
  X,
  Bot,
  Briefcase,
  Archive,
  Pin,
  Inbox,
  BarChart3,
  FolderOpen,
  DollarSign,
} from "lucide-react";
import { AppNav } from "@/components/layout/AppNav";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { CHAT_UNREAD_REFRESH_EVENT } from "@/components/chat/useUnreadChatCount";
import { createClient } from "@/lib/supabase/client";
import {
  conversationLabel,
  editMessage,
  enrichMessagesWithReplies,
  attachReplyFromThread,
  filterConversationPreviews,
  findOrCreateConversation,
  formatMessageTime,
  joinChannel,
  loadActiveChat,
  loadAllConversations,
  loadMutualFriends,
  loadPublicChannels,
  secretMessageExpiry,
} from "@/lib/chat";
import {
  chatThemeBackgroundStyle,
  loadChatTheme,
  setConversationArchived,
  setConversationPinned,
} from "@/lib/chat-themes";
import { hasBusinessProfile } from "@/lib/business";
import { canEditWithinWindow } from "@/lib/edit-window";
import {
  deleteMessageForEveryone,
  forwardMessage,
  hideMessageForMe,
  loadHiddenMessageIds,
  translateMessageText,
} from "@/lib/message-actions";
import { findUserByPhone } from "@/lib/phone";
import { formatLastSeen, isOnline } from "@/lib/presence";
import { sendVoiceMessage } from "@/lib/voicemail";
import type {
  ActiveChat,
  CallType,
  ConversationMemberSettings,
  ConversationPreview,
  Message,
  Profile,
} from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { SearchWithSuggestions } from "@/components/search/SearchWithSuggestions";
import { useCalls } from "@/components/chat/CallProvider";
import { CreateConversationModal } from "@/components/chat/CreateConversationModal";
import { ChatMessageBubble } from "@/components/chat/ChatMessageBubble";
import { ForwardMessageModal } from "@/components/chat/ForwardMessageModal";
import { MessageActionSheet, type MessageActionId } from "@/components/chat/MessageActionSheet";
import { VoiceRecorder } from "@/components/chat/VoiceRecorder";
import { GiftPickerModal } from "@/components/gifts/GiftPickerModal";
import { PayInChatModal } from "@/components/chat/PayInChatModal";
import { ChatThemeModal } from "@/components/chat/ChatThemeModal";
import { CreatePollModal } from "@/components/chat/CreatePollModal";
import { MessageRequestsPanel } from "@/components/chat/MessageRequestsPanel";
import { UserSafetyMenu } from "@/components/safety/UserSafetyMenu";
import { markConversationRead, createChatFolder, loadChatFolders } from "@/lib/chat-folders";
import {
  isMessageReadByOther,
  loadConversationReadCursors,
  otherMemberReadAt as pickOtherMemberReadAt,
} from "@/lib/read-receipts";
import type { ChatFolder } from "@/lib/types";
import { LastSeenUpdater } from "@/components/presence/LastSeenUpdater";
import { WelcomeEmailTrigger } from "@/components/auth/WelcomeEmailTrigger";
import { SectionTipBanner } from "@/components/layout/SectionTipBanner";
import {
  ASSISTANT_DISPLAY_NAME,
  isAssistantProfile,
} from "@/lib/assistant";

type Tab = "chats" | "seller" | "discover" | "phone" | "channels" | "secret" | "archived" | "requests" | "unread";

function splitConversationLists(
  all: ConversationPreview[],
  userId: string,
  isSeller: boolean,
  folderFilter?: string | null,
) {
  return {
    conversations: filterConversationPreviews(all, userId, "regular", folderFilter),
    sellerChats: isSeller
      ? filterConversationPreviews(all, userId, "seller")
      : [],
    secretChats: filterConversationPreviews(all, userId, "secret"),
    archivedChats: filterConversationPreviews(all, userId, "archived"),
    unreadChats: filterConversationPreviews(all, userId, "unread"),
  };
}

export function ChatApp({
  currentUser,
  initialConversations,
  initialChatFolders,
}: {
  currentUser: Profile;
  initialConversations?: ConversationPreview[];
  initialChatFolders?: ChatFolder[];
}) {
  const getSupabase = useCallback(() => createClient(), []);
  const { startCall: startCallSession } = useCalls();
  const isSeller = hasBusinessProfile(currentUser);
  const searchParams = useSearchParams();
  const deepLinkConvId = searchParams.get("c");
  const openedDeepLink = useRef<string | null>(null);
  const initialSplit =
    initialConversations !== undefined
      ? splitConversationLists(initialConversations, currentUser.id, isSeller)
      : null;
  const usedInitialConversations = useRef(initialConversations !== undefined);

  const [tab, setTab] = useState<Tab>("chats");
  const [conversations, setConversations] = useState<ConversationPreview[]>(
    initialSplit?.conversations ?? [],
  );
  const [sellerChats, setSellerChats] = useState<ConversationPreview[]>(
    initialSplit?.sellerChats ?? [],
  );
  const [secretChats, setSecretChats] = useState<ConversationPreview[]>(
    initialSplit?.secretChats ?? [],
  );
  const [archivedChats, setArchivedChats] = useState<ConversationPreview[]>(
    initialSplit?.archivedChats ?? [],
  );
  const [unreadChats, setUnreadChats] = useState<ConversationPreview[]>(
    initialSplit?.unreadChats ?? [],
  );
  const [chatFolders, setChatFolders] = useState<ChatFolder[]>(
    initialChatFolders ?? [],
  );
  const [activeFolderId, setActiveFolderId] = useState<string | null | undefined>(undefined);
  const [showPollModal, setShowPollModal] = useState(false);
  const [secretFriends, setSecretFriends] = useState<Profile[]>([]);
  const [activeChat, setActiveChat] = useState<ActiveChat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [phoneSearch, setPhoneSearch] = useState("");
  const [phoneResult, setPhoneResult] = useState<Profile | null>(null);
  const [discoverUsers, setDiscoverUsers] = useState<Profile[]>([]);
  const [publicChannels, setPublicChannels] = useState<ConversationPreview[]>([]);
  const [countryFilter, setCountryFilter] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [modal, setModal] = useState<"group" | "channel" | "add-members" | null>(null);
  const [sendingVoice, setSendingVoice] = useState(false);
  const [recordingVoice, setRecordingVoice] = useState(false);
  const [showGift, setShowGift] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [chatTheme, setChatTheme] = useState<ConversationMemberSettings | null>(null);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editMessageDraft, setEditMessageDraft] = useState("");
  const [messageEditError, setMessageEditError] = useState<string | null>(null);
  const [savingMessageEdit, setSavingMessageEdit] = useState(false);
  const [assistantOpening, setAssistantOpening] = useState(false);
  const [assistantThinking, setAssistantThinking] = useState(false);
  const [messageSearch, setMessageSearch] = useState("");
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [actionMessage, setActionMessage] = useState<Message | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [otherMemberReadAt, setOtherMemberReadAt] = useState<string | null>(null);

  const isAssistantChat =
    !!activeChat?.otherUser && isAssistantProfile(activeChat.otherUser);

  const refreshConversations = useCallback(async () => {
    const supabase = getSupabase();
    const folderFilter = activeFolderId;
    const [all, folders] = await Promise.all([
      loadAllConversations(supabase, currentUser.id),
      loadChatFolders(supabase, currentUser.id),
    ]);
    const split = splitConversationLists(
      all,
      currentUser.id,
      isSeller,
      folderFilter,
    );
    setConversations(split.conversations);
    setSellerChats(split.sellerChats);
    setSecretChats(split.secretChats);
    setArchivedChats(split.archivedChats);
    setUnreadChats(split.unreadChats);
    setChatFolders(folders);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(CHAT_UNREAD_REFRESH_EVENT));
    }
  }, [getSupabase, currentUser.id, activeFolderId, isSeller]);

  useEffect(() => {
    if (usedInitialConversations.current && initialConversations) {
      usedInitialConversations.current = false;
      const split = splitConversationLists(
        initialConversations,
        currentUser.id,
        isSeller,
        activeFolderId,
      );
      setConversations(split.conversations);
      setSellerChats(split.sellerChats);
      setSecretChats(split.secretChats);
      setArchivedChats(split.archivedChats);
      setUnreadChats(split.unreadChats);
      return;
    }
    void refreshConversations();
  }, [refreshConversations, initialConversations, currentUser.id, isSeller, activeFolderId]);

  useEffect(() => {
    if (!chatTheme?.translation_enabled) return;
    const target = chatTheme.translation_target_lang || "en";
    const incoming = messages.filter(
      (m) =>
        m.sender_id !== currentUser.id &&
        (!m.message_type || m.message_type === "text") &&
        !translations[m.id],
    );
    if (!incoming.length) return;

    let cancelled = false;
    (async () => {
      for (const msg of incoming) {
        if (cancelled) break;
        try {
          const res = await fetch("/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: msg.content, targetLang: target }),
          });
          if (!res.ok) continue;
          const data = (await res.json()) as { translated?: string };
          if (data.translated && !cancelled) {
            setTranslations((prev) => ({ ...prev, [msg.id]: data.translated! }));
          }
        } catch {
          // skip failed translation
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- batch translate when message list or theme changes
  }, [messages, chatTheme?.translation_enabled, chatTheme?.translation_target_lang, currentUser.id]);

  useEffect(() => {
    async function loadDiscover() {
      const supabase = getSupabase();
      let query = supabase
        .from("profiles")
        .select("*")
        .neq("id", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (countryFilter) query = query.eq("country", countryFilter);
      if (search.trim()) {
        query = query.or(
          `display_name.ilike.%${search}%,username.ilike.%${search}%,country.ilike.%${search}%`,
        );
      }

      const { data } = await query;
      setDiscoverUsers((data as Profile[]) ?? []);
    }

    if (tab === "discover") loadDiscover();
  }, [tab, search, countryFilter, getSupabase, currentUser.id]);

  useEffect(() => {
    if (tab === "channels") {
      loadPublicChannels(getSupabase(), currentUser.id).then(setPublicChannels);
    }
    if (tab === "secret") {
      loadMutualFriends(getSupabase(), currentUser.id).then(setSecretFriends);
    }
  }, [tab, getSupabase, currentUser.id, conversations]);

  const loadMessages = useCallback(
    async (convId: string, isSecret?: boolean) => {
      setLoadingMsgs(true);
      const supabase = getSupabase();
      let query = supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });

      if (isSecret) {
        query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
      }

      const { data } = await query;
      const rows = (data as Message[]) ?? [];
      const hiddenIds = await loadHiddenMessageIds(supabase, currentUser.id, convId);
      const visible = rows.filter((m) => !hiddenIds.has(m.id));
      setMessages(await enrichMessagesWithReplies(supabase, visible));
      setLoadingMsgs(false);
    },
    [getSupabase, currentUser.id],
  );

  const refreshReadCursors = useCallback(
    async (convId: string, otherUserId?: string) => {
      const cursors = await loadConversationReadCursors(getSupabase(), convId);
      setOtherMemberReadAt(pickOtherMemberReadAt(cursors, otherUserId));
    },
    [getSupabase],
  );

  useEffect(() => {
    if (!activeChat?.convId || activeChat.kind !== "dm" || !activeChat.otherUser) {
      setOtherMemberReadAt(null);
      return;
    }

    void refreshReadCursors(activeChat.convId, activeChat.otherUser.id);
    const interval = window.setInterval(() => {
      void refreshReadCursors(activeChat.convId, activeChat.otherUser!.id);
    }, 4000);

    return () => window.clearInterval(interval);
  }, [activeChat?.convId, activeChat?.kind, activeChat?.otherUser?.id, refreshReadCursors]);

  useEffect(() => {
    if (!activeChat?.convId || loadingMsgs) return;
    void markConversationRead(
      getSupabase(),
      currentUser.id,
      activeChat.convId,
      currentUser,
    );
  }, [activeChat?.convId, messages.length, loadingMsgs, getSupabase, currentUser]);

  useEffect(() => {
    if (!activeChat?.convId) return;

    loadMessages(activeChat.convId, activeChat.isSecret);

    const supabase = getSupabase();
    const channel = supabase
      .channel(`messages:${activeChat.convId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeChat.convId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, attachReplyFromThread(msg, prev)];
          });
          refreshConversations();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeChat.convId}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChat?.convId, activeChat?.isSecret, getSupabase, loadMessages, refreshConversations]);

  useEffect(() => {
    if (!activeChat?.otherUser) return;

    const refreshPresence = async () => {
      const { data } = await getSupabase()
        .from("profiles")
        .select("last_seen_at")
        .eq("id", activeChat.otherUser!.id)
        .maybeSingle();

      if (!data?.last_seen_at) return;

      setActiveChat((prev) => {
        if (!prev?.otherUser || prev.otherUser.id !== activeChat.otherUser!.id) {
          return prev;
        }
        return {
          ...prev,
          otherUser: { ...prev.otherUser, last_seen_at: data.last_seen_at },
        };
      });
    };

    refreshPresence();
    const interval = window.setInterval(refreshPresence, 30_000);
    return () => window.clearInterval(interval);
  }, [activeChat?.otherUser, getSupabase]);

  async function openConversationById(convId: string) {
    setChatError(null);
    const chat = await loadActiveChat(getSupabase(), currentUser.id, convId);
    if (!chat) {
      setChatError("Could not open conversation.");
      return;
    }
    setActiveChat(chat);
    const theme = await loadChatTheme(getSupabase(), currentUser.id, convId);
    setChatTheme(theme);
    if (chat.isSecret) {
      setTab("secret");
    } else if (chat.isSellerGig && isSeller) {
      setTab("seller");
    } else {
      setTab("chats");
    }
    setEditingMessageId(null);
    setTranslations({});
    setShowMessageSearch(false);
    setMessageSearch("");
    setReplyingTo(null);
    await loadMessages(convId, chat.isSecret);
    await markConversationRead(getSupabase(), currentUser.id, convId, currentUser);
    await refreshReadCursors(convId, chat.otherUser?.id);
    await refreshConversations();
  }

  useEffect(() => {
    if (!deepLinkConvId) return;
    if (openedDeepLink.current === deepLinkConvId) return;
    openedDeepLink.current = deepLinkConvId;
    void openConversationById(deepLinkConvId);
    // Intentionally only when the deep-link id changes; openConversationById is stable enough via refs/state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkConvId]);

  async function openDm(other: Profile, convId?: string, secret = false) {
    setChatError(null);

    if (!convId) {
      const { convId: createdId, error } = await findOrCreateConversation(
        getSupabase(),
        currentUser.id,
        other.id,
        { secret },
      );
      if (error) {
        setChatError(error);
        return;
      }
      if (!createdId) return;
      convId = createdId;
    }

    await openConversationById(convId);
  }

  async function openAssistantChat() {
    setAssistantOpening(true);
    setChatError(null);
    try {
      const res = await fetch("/api/assistant/conversation", { method: "POST" });
      const data = (await res.json()) as {
        convId?: string;
        assistant?: Profile;
        error?: string;
      };
      if (!res.ok || !data.convId) {
        setChatError(data.error ?? "Could not open Zumelia AI.");
        return;
      }
      await openConversationById(data.convId);
      setTab("chats");
    } catch {
      setChatError("Could not open Zumelia AI.");
    } finally {
      setAssistantOpening(false);
    }
  }

  async function searchByPhone(e: React.FormEvent) {
    e.preventDefault();
    setChatError(null);
    setPhoneResult(null);

    const { user, error } = await findUserByPhone(getSupabase(), phoneSearch);
    if (error) {
      setChatError(error);
      return;
    }
    setPhoneResult(user);
  }

  async function startCall(callType: CallType) {
    if (!activeChat?.convId) return;
    if (activeChat.kind === "channel") {
      setChatError("Calls are not available in channels.");
      return;
    }
    setChatError(null);

    const { error } = await startCallSession({
      conversationId: activeChat.convId,
      callType,
      title: activeChat.title,
      callee: activeChat.otherUser ?? null,
    });
    if (error) setChatError(error);
  }

  async function handleVoiceRecorded(blob: Blob, duration: number) {
    if (!activeChat?.convId) return;
    setSendingVoice(true);
    setRecordingVoice(false);
    setChatError(null);

    const { message, error } = await sendVoiceMessage(
      getSupabase(),
      activeChat.convId,
      currentUser.id,
      blob,
      duration,
      activeChat.isSecret ? secretMessageExpiry() : null,
    );

    setSendingVoice(false);
    if (error) {
      setChatError(error);
      return;
    }
    if (message) {
      setMessages((prev) =>
        prev.some((m) => m.id === message.id) ? prev : [...prev, message],
      );
      await refreshConversations();
    }
  }

  async function handleJoinChannel(convId: string) {
    setChatError(null);
    const { error } = await joinChannel(getSupabase(), currentUser.id, convId);
    if (error) {
      setChatError(error);
      return;
    }
    await refreshConversations();
    await openConversationById(convId);
  }

  async function handleSaveMessageEdit(messageId: string, createdAt: string) {
    setSavingMessageEdit(true);
    setMessageEditError(null);
    const { error } = await editMessage(
      getSupabase(),
      messageId,
      currentUser.id,
      editMessageDraft,
      createdAt,
    );
    setSavingMessageEdit(false);
    if (error) {
      setMessageEditError(error);
      return;
    }
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              content: editMessageDraft.trim(),
              edited_at: new Date().toISOString(),
            }
          : m,
      ),
    );
    setEditingMessageId(null);
    setEditMessageDraft("");
  }

  async function handleTogglePin(convId: string, pinned: boolean) {
    const { error } = await setConversationPinned(
      getSupabase(),
      currentUser.id,
      convId,
      !pinned,
    );
    if (error) setChatError(error);
    await refreshConversations();
  }

  async function handleToggleArchive(convId: string, archived: boolean) {
    await setConversationArchived(getSupabase(), currentUser.id, convId, !archived);
    if (activeChat?.convId === convId && !archived) {
      setActiveChat(null);
    }
    await refreshConversations();
  }

  function closeActiveChat() {
    setActiveChat(null);
    setReplyingTo(null);
    setShowMessageSearch(false);
    setMessageSearch("");
    setActionMessage(null);
    setEditingMessageId(null);
  }

  const allConversationsForForward = useMemo(() => {
    const map = new Map<string, ConversationPreview>();
    for (const conv of [...conversations, ...sellerChats, ...secretChats]) {
      map.set(conv.id, conv);
    }
    return [...map.values()];
  }, [conversations, sellerChats, secretChats]);

  async function handleMessageAction(action: MessageActionId) {
    if (!actionMessage) return;
    const msg = actionMessage;
    setActionMessage(null);

    switch (action) {
      case "reply":
        setReplyingTo(msg);
        break;
      case "copy":
        try {
          await navigator.clipboard.writeText(msg.content);
        } catch {
          setChatError("Could not copy to clipboard.");
        }
        break;
      case "edit":
        setEditingMessageId(msg.id);
        setEditMessageDraft(msg.content);
        setMessageEditError(null);
        break;
      case "translate": {
        const target = chatTheme?.translation_target_lang || "en";
        const { translated, error } = await translateMessageText(msg.content, target);
        if (error) setChatError(error);
        else if (translated) {
          setTranslations((prev) => ({ ...prev, [msg.id]: translated }));
        }
        break;
      }
      case "forward":
        setForwardingMessage(msg);
        break;
      case "delete_me": {
        const { error } = await hideMessageForMe(getSupabase(), currentUser.id, msg.id);
        if (error) setChatError(error);
        else setMessages((prev) => prev.filter((m) => m.id !== msg.id));
        break;
      }
      case "delete_everyone": {
        const { error } = await deleteMessageForEveryone(
          getSupabase(),
          currentUser.id,
          msg.id,
          msg.created_at,
        );
        if (error) setChatError(error);
        else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msg.id
                ? {
                    ...m,
                    content: "This message was deleted",
                    deleted_at: new Date().toISOString(),
                  }
                : m,
            ),
          );
        }
        break;
      }
    }
  }

  async function handleForwardTo(conversationId: string) {
    if (!forwardingMessage) return;
    const { error } = await forwardMessage(
      getSupabase(),
      currentUser.id,
      conversationId,
      forwardingMessage.content,
    );
    setForwardingMessage(null);
    if (error) setChatError(error);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !activeChat?.convId || sending || !activeChat.canPost) return;

    setSending(true);
    setChatError(null);
    const content = draft.trim();
    const replyTarget = replyingTo;
    const replyId = replyTarget?.id ?? null;
    setDraft("");
    setReplyingTo(null);

    const { data, error } = await getSupabase()
      .from("messages")
      .insert({
        conversation_id: activeChat.convId,
        sender_id: currentUser.id,
        content,
        ...(replyId ? { reply_to_id: replyId } : {}),
        ...(activeChat.isSecret ? { expires_at: secretMessageExpiry() } : {}),
      })
      .select()
      .single();

    if (error) {
      setChatError(
        error.message.includes("row-level security")
          ? "You cannot send messages in this conversation."
          : error.message,
      );
      setDraft(content);
      setSending(false);
      return;
    }

    if (data) {
      const sent = data as Message;
      const withReply =
        replyId && replyTarget
          ? {
              ...sent,
              reply_to: {
                id: replyTarget.id,
                content: replyTarget.content,
                sender_id: replyTarget.sender_id,
                sender: activeChat.members?.find((m) => m.id === replyTarget.sender_id),
              },
            }
          : sent;
      setMessages((prev) => {
        if (prev.some((m) => m.id === withReply.id)) return prev;
        return [...prev, withReply];
      });
      await refreshConversations();

      if (
        activeChat.otherUser &&
        isAssistantProfile(activeChat.otherUser) &&
        activeChat.convId
      ) {
        setAssistantThinking(true);
        void fetch("/api/assistant/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            conversationId: activeChat.convId,
          }),
        })
          .then(async (res) => {
            if (!res.ok) {
              const data = (await res.json()) as { error?: string };
              setChatError(data.error ?? "Zumelia AI could not reply.");
            }
          })
          .catch(() => {
            setChatError("Zumelia AI could not reply. Try again.");
          })
          .finally(() => setAssistantThinking(false));
      } else if (
        activeChat.otherUser &&
        activeChat.dm_context === "business" &&
        activeChat.otherUser.business_auto_reply_enabled &&
        activeChat.convId
      ) {
        void fetch("/api/business/auto-reply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: activeChat.convId,
            message: content,
            businessUserId: activeChat.otherUser.id,
          }),
        });
      }
    }

    setSending(false);
  }

  const countriesInDiscover = [...new Set(discoverUsers.map((u) => u.country))].sort();

  return (
    <div
      className={`vintage-page flex h-screen flex-col text-vintage-ink ${
        activeChat
          ? "pb-0"
          : "pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0"
      }`}
    >
      <WelcomeEmailTrigger />
      <LastSeenUpdater userId={currentUser.id} />
      <AppNav user={currentUser} />
      {!activeChat && (
        <div className="border-b border-vintage-border bg-vintage-paper px-3 py-2 md:px-4">
          <SectionTipBanner section="chat" />
        </div>
      )}
      {modal && (
        <CreateConversationModal
          mode={modal}
          userId={currentUser.id}
          convId={modal === "add-members" ? activeChat?.convId : undefined}
          onClose={() => setModal(null)}
          onCreated={async (convId) => {
            setModal(null);
            await refreshConversations();
            await openConversationById(convId);
          }}
        />
      )}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside
          className={`${
            activeChat ? "hidden md:flex" : "flex min-h-0 flex-1"
          } w-full flex-col border-r border-vintage-border bg-vintage-paper md:w-80 md:flex-none lg:w-96`}
        >
          <div className="border-b border-vintage-border p-3">
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
              <button
                type="button"
                onClick={() => setModal("group")}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg vintage-card-inset py-2 text-xs font-medium text-vintage-ink-muted transition hover:bg-vintage-rust/10 hover:text-vintage-rust"
              >
                <Users className="h-3.5 w-3.5" /> Group
              </button>
              <button
                type="button"
                onClick={() => setModal("channel")}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg vintage-card-inset py-2 text-xs font-medium text-vintage-ink-muted transition hover:bg-vintage-rust/10 hover:text-vintage-rust"
              >
                <Megaphone className="h-3.5 w-3.5" /> Channel
              </button>
            </div>

            <div className="mb-2 flex gap-1">
              <Link
                href="/feed"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg vintage-card-inset py-2 text-xs font-medium text-vintage-ink-muted transition hover:bg-vintage-rust/10 hover:text-vintage-rust"
              >
                <Home className="h-3.5 w-3.5" /> Feed
              </Link>
              <Link
                href={`/profile/${currentUser.username}`}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg vintage-card-inset py-2 text-xs font-medium text-vintage-ink-muted transition hover:bg-vintage-rust/10 hover:text-vintage-rust"
              >
                <User className="h-3.5 w-3.5" /> Profile
              </Link>
            </div>

            <div className="flex flex-wrap gap-1 vintage-card-inset p-1">
              {(
                [
                  ["chats", MessageCircle, "Chats"],
                  ...(isSeller ? ([["seller", Briefcase, "Seller"]] as const) : []),
                  ["unread", Inbox, "Unread"],
                  ["requests", UserPlus, "Requests"],
                  ["secret", Lock, "Secret"],
                  ["archived", Archive, "Archived"],
                  ["discover", Globe, "Discover"],
                  ["phone", Phone, "Phone"],
                  ["channels", Hash, "Channels"],
                ] as const
              ).map(([id, Icon, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex flex-1 min-w-[4.5rem] items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium transition ${
                    tab === id
                      ? "bg-vintage-rust text-on-rust"
                      : "text-vintage-ink-muted hover:text-vintage-ink"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {chatError ? (
            <p className="border-b border-vintage-border bg-vintage-rust/10 px-4 py-2 text-xs text-vintage-rust">
              {chatError}
            </p>
          ) : null}

          {tab === "chats" && (
            <div className="flex-1 overflow-y-auto">
              <div className="border-b border-vintage-border/60 px-2 py-2">
                <div className="flex flex-wrap items-center gap-1">
                  <FolderOpen className="h-3.5 w-3.5 text-vintage-ink-muted" />
                  <button
                    type="button"
                    onClick={() => setActiveFolderId(undefined)}
                    className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${
                      activeFolderId === undefined ? "bg-vintage-rust text-on-rust" : "vintage-card-inset"
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFolderId(null)}
                    className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${
                      activeFolderId === null ? "bg-vintage-rust text-on-rust" : "vintage-card-inset"
                    }`}
                  >
                    Unfiled
                  </button>
                  {chatFolders.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setActiveFolderId(f.id)}
                      className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${
                        activeFolderId === f.id ? "bg-vintage-rust text-on-rust" : "vintage-card-inset"
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={async () => {
                      const name = window.prompt("Folder name");
                      if (!name?.trim()) return;
                      await createChatFolder(getSupabase(), currentUser.id, name);
                      await refreshConversations();
                    }}
                    className="rounded-lg px-2 py-1 text-[10px] font-semibold text-vintage-rust"
                  >
                    + Folder
                  </button>
                </div>
              </div>
              <div className="border-b border-vintage-border/60 p-2">
                <button
                  type="button"
                  onClick={() => void openAssistantChat()}
                  disabled={assistantOpening}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                    isAssistantChat
                      ? "bg-vintage-rust/10"
                      : "hover:bg-vintage-paper-dark/60"
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-vintage-rust text-on-rust">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-vintage-ink">{ASSISTANT_DISPLAY_NAME}</p>
                    <p className="truncate text-xs text-vintage-ink-muted">
                      Ask anything — general questions, ideas, or app help
                    </p>
                  </div>
                </button>
              </div>
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                  <Users className="h-10 w-10 text-vintage-border" />
                  <p className="text-sm text-vintage-ink-muted">
                    No conversations yet. Create a group, channel, or discover people.
                  </p>
                  <button
                    onClick={() => setTab("discover")}
                    className="vintage-btn-outline px-4 py-2 text-sm"
                  >
                    Discover people
                  </button>
                </div>
              ) : (
                <div className="space-y-0.5 p-2">
                  {conversations.map((conv) => {
                    const active = activeChat?.convId === conv.id;
                    return (
                      <div
                        key={conv.id}
                        className={`relative flex items-center gap-1 rounded-xl ${
                          active ? "bg-vintage-rust/10" : "hover:bg-vintage-paper-dark/60"
                        }`}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-vintage-rust" />
                        )}
                        <button
                          type="button"
                          onClick={() => openConversationById(conv.id)}
                          className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left"
                        >
                          <Avatar
                            name={conversationLabel(conv)}
                            avatarUrl={conv.other_user?.avatar_url ?? null}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p
                                className={`truncate ${
                                  active
                                    ? "font-semibold text-vintage-rust"
                                    : "font-medium text-vintage-ink"
                                }`}
                              >
                                {conv.is_pinned ? "📌 " : ""}
                                {conversationLabel(conv)}
                              </p>
                              {conv.last_message_at && (
                                <span className="shrink-0 text-[11px] text-vintage-ink-muted">
                                  {formatMessageTime(conv.last_message_at)}
                                </span>
                              )}
                            </div>
                            <p className="truncate text-xs text-vintage-ink-muted">
                              {conv.kind === "dm"
                                ? conv.other_user?.country
                                : conv.kind === "group"
                                  ? `Group · ${conv.member_count ?? 0} members`
                                  : `Channel · ${conv.member_count ?? 0} subscribers`}
                              {conv.last_message ? ` · ${conv.last_message}` : ""}
                            </p>
                          </div>
                        </button>
                        <div className="flex shrink-0 gap-0.5 pr-1">
                          <button
                            type="button"
                            title={conv.is_pinned ? "Unpin" : "Pin"}
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleTogglePin(conv.id, !!conv.is_pinned);
                            }}
                            className="rounded-lg p-1.5 text-vintage-ink-muted hover:bg-vintage-rust/10 hover:text-vintage-rust"
                          >
                            <Pin className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Archive"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleToggleArchive(conv.id, false);
                            }}
                            className="rounded-lg p-1.5 text-vintage-ink-muted hover:bg-vintage-rust/10 hover:text-vintage-rust"
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === "seller" && isSeller && (
            <div className="flex-1 overflow-y-auto">
              <div className="border-b border-vintage-border bg-vintage-rust/5 px-4 py-3">
                <div className="mb-1 flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-vintage-rust" />
                  <p className="text-sm font-semibold">Seller inbox</p>
                </div>
                <p className="text-xs text-vintage-ink-muted">
                  Messages from buyers who inquire about your gigs or services.{" "}
                  <Link
                    href="/profile/settings#chat-settings"
                    className="font-semibold text-vintage-rust hover:underline"
                  >
                    Seller chat settings
                  </Link>
                </p>
              </div>
              {sellerChats.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                  <Briefcase className="h-10 w-10 text-vintage-border" />
                  <p className="text-sm text-vintage-ink-muted">
                    No gig inquiries yet. When a buyer messages you about a service listing, it appears here.
                  </p>
                </div>
              ) : (
                <div className="space-y-0.5 p-2">
                  {sellerChats.map((conv) => {
                    const active = activeChat?.convId === conv.id;
                    return (
                      <button
                        key={conv.id}
                        type="button"
                        onClick={() => openConversationById(conv.id)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${
                          active ? "bg-vintage-rust/10" : "hover:bg-vintage-paper-dark/60"
                        }`}
                      >
                        <Avatar
                          name={conversationLabel(conv)}
                          avatarUrl={conv.other_user?.avatar_url ?? null}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`truncate font-medium ${active ? "text-vintage-rust" : "text-vintage-ink"}`}>
                              {conversationLabel(conv)}
                            </p>
                            {conv.last_message_at && (
                              <span className="shrink-0 text-[11px] text-vintage-ink-muted">
                                {formatMessageTime(conv.last_message_at)}
                              </span>
                            )}
                          </div>
                          <p className="truncate text-xs text-vintage-ink-muted">
                            {conv.last_message ?? "Customer inquiry"}
                          </p>
                        </div>
                        {conv.is_unread && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-vintage-rust" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === "unread" && (
            <div className="flex-1 overflow-y-auto p-2">
              {unreadChats.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-vintage-ink-muted">
                  You&apos;re all caught up — no unread chats.
                </p>
              ) : (
                unreadChats.map((conv) => (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => openConversationById(conv.id)}
                    className="mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-vintage-paper-dark/60"
                  >
                    <Avatar
                      name={conversationLabel(conv)}
                      avatarUrl={conv.other_user?.avatar_url ?? null}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{conversationLabel(conv)}</p>
                      <p className="truncate text-xs text-vintage-ink-muted">
                        {conv.last_message ?? "New activity"}
                      </p>
                    </div>
                    <span className="h-2 w-2 shrink-0 rounded-full bg-vintage-rust" />
                  </button>
                ))
              )}
            </div>
          )}

          {tab === "requests" && (
            <MessageRequestsPanel
              userId={currentUser.id}
              onOpenConversation={(id) => void openConversationById(id)}
              onRefresh={() => void refreshConversations()}
            />
          )}

          {tab === "archived" && (
            <div className="flex-1 overflow-y-auto p-2">
              {archivedChats.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-vintage-ink-muted">
                  No archived chats. Archive a conversation from the Chats tab.
                </p>
              ) : (
                archivedChats.map((conv) => (
                  <div
                    key={conv.id}
                    className="mb-1 flex items-center gap-1 rounded-xl hover:bg-vintage-paper-dark/60"
                  >
                    <button
                      type="button"
                      onClick={() => openConversationById(conv.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left"
                    >
                      <Avatar
                        name={conversationLabel(conv)}
                        avatarUrl={conv.other_user?.avatar_url ?? null}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {conversationLabel(conv)}
                          {conv.is_unread && (
                            <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-vintage-rust" />
                          )}
                        </p>
                        <p className="truncate text-xs text-vintage-ink-muted">
                          {conv.last_message ?? "Archived"}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      title="Unarchive"
                      onClick={() => void handleToggleArchive(conv.id, true)}
                      className="mr-2 rounded-lg p-1.5 text-xs font-medium text-vintage-rust hover:bg-vintage-rust/10"
                    >
                      Restore
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "discover" && (
            <>
              <div className="space-y-2 border-b-2 border-vintage-border p-3">
                <Link
                  href="/discover/businesses"
                  className="flex items-center gap-2 rounded-lg vintage-card-inset px-3 py-2 text-xs font-semibold text-vintage-rust transition hover:bg-vintage-rust/10"
                >
                  <Briefcase className="h-3.5 w-3.5" /> Discover businesses
                </Link>
                <SearchWithSuggestions
                  scope="people"
                  value={search}
                  onChange={setSearch}
                  excludeUserId={currentUser.id}
                  placeholder="Search name, username, country…"
                />
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
                {discoverUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-2 border-b border-vintage-border/40 px-4 py-3"
                  >
                    <Link
                      href={`/profile/${user.username}`}
                      className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-80"
                    >
                      <Avatar name={user.display_name} avatarUrl={user.avatar_url} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{user.display_name}</p>
                        <p className="truncate text-xs text-vintage-ink-muted">
                          @{user.username} · {user.country}
                        </p>
                      </div>
                    </Link>
                    <button
                      onClick={() => openDm(user)}
                      className="vintage-btn shrink-0 px-2 py-1 text-xs"
                    >
                      Chat
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === "phone" && (
            <div className="flex-1 overflow-y-auto p-3">
              <p className="mb-3 text-xs text-vintage-ink-muted">
                Verify your phone in Profile → Edit profile, then search by number.
              </p>
              <form onSubmit={searchByPhone} className="mb-4 space-y-2">
                <input
                  value={phoneSearch}
                  onChange={(e) => setPhoneSearch(e.target.value)}
                  placeholder="+2348012345678"
                  className="vintage-input w-full px-3 py-2 text-sm"
                />
                <button type="submit" className="vintage-btn w-full py-2 text-sm">
                  Find by phone
                </button>
              </form>
              {phoneResult && (
                <div className="flex items-center gap-3 vintage-card-inset p-3">
                  <Avatar name={phoneResult.display_name} avatarUrl={phoneResult.avatar_url} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{phoneResult.display_name}</p>
                    <p className="text-xs text-vintage-ink-muted">@{phoneResult.username}</p>
                  </div>
                  <button
                    onClick={() => openDm(phoneResult)}
                    className="vintage-btn px-2 py-1 text-xs"
                  >
                    Chat
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === "secret" && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="border-b border-vintage-border bg-vintage-paper-dark/30 px-4 py-3">
                <div className="mb-1 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-vintage-rust" />
                  <p className="text-sm font-semibold">Secret chats</p>
                </div>
                <p className="text-xs text-vintage-ink-muted">
                  Private conversations — hidden from your main chat list. Messages delete after 24 hours.
                </p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {secretChats.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-vintage-ink-muted">
                    No secret chats yet. Start one with a mutual friend below.
                  </p>
                ) : (
                  secretChats.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => openConversationById(conv.id)}
                      className={`flex w-full items-center gap-3 border-b border-vintage-border/40 px-4 py-3 text-left hover:bg-vintage-paper-dark/50 ${
                        activeChat?.convId === conv.id ? "bg-vintage-rust/10" : ""
                      }`}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-vintage-ink/10">
                        <Lock className="h-4 w-4 text-vintage-rust" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {conv.other_user?.display_name ?? "Secret chat"}
                        </p>
                        <p className="truncate text-xs text-vintage-ink-muted">
                          {conv.last_message ?? "Tap to open"}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
              <div className="border-t border-vintage-border p-3">
                <p className="mb-2 text-xs font-medium text-vintage-ink-muted">New secret chat</p>
                <div className="max-h-40 space-y-1 overflow-y-auto">
                  {secretFriends.length === 0 ? (
                    <p className="text-xs text-vintage-ink-muted">Connect with friends first.</p>
                  ) : (
                    secretFriends.map((friend) => (
                      <button
                        key={friend.id}
                        type="button"
                        onClick={() => openDm(friend, undefined, true)}
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left hover:bg-vintage-paper-dark/50"
                      >
                        <Avatar name={friend.display_name} avatarUrl={friend.avatar_url} size="sm" />
                        <span className="text-sm">{friend.display_name}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === "channels" && (
            <div className="flex-1 overflow-y-auto">
              {publicChannels.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-vintage-ink-muted">
                  No public channels to join. Create one with the Channel button.
                </p>
              ) : (
                publicChannels.map((ch) => (
                  <div
                    key={ch.id}
                    className="flex items-center gap-3 border-b border-vintage-border/40 px-4 py-3"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-vintage-rust/15">
                      <Hash className="h-5 w-5 text-vintage-rust" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{ch.name}</p>
                      <p className="truncate text-xs text-vintage-ink-muted">{ch.last_message}</p>
                    </div>
                    <button
                      onClick={() => handleJoinChannel(ch.id)}
                      className="vintage-btn-outline flex items-center gap-1 px-2 py-1 text-xs"
                    >
                      <UserPlus className="h-3.5 w-3.5" /> Join
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </aside>

        <main
          className={`${
            activeChat ? "flex" : "hidden md:flex"
          } min-h-0 flex-1 flex-col`}
        >
          {activeChat ? (
            <>
              <header
                className={`flex items-center gap-2 border-b px-3 py-3 md:gap-3 md:px-4 ${
                  activeChat.isSecret
                    ? "border-vintage-ink/20 bg-vintage-ink/5"
                    : "border-vintage-border bg-vintage-paper"
                }`}
              >
                <button
                  type="button"
                  onClick={closeActiveChat}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-vintage-ink hover:bg-vintage-paper-dark/60 md:hidden"
                  aria-label="Back to chats"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                {activeChat.isSecret && (
                  <Lock className="h-4 w-4 shrink-0 text-vintage-rust" aria-hidden />
                )}
                {activeChat.otherUser ? (
                  isAssistantProfile(activeChat.otherUser) ? (
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-vintage-rust text-on-rust">
                        <Bot className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold">{ASSISTANT_DISPLAY_NAME}</p>
                        <p className="text-xs text-vintage-ink-muted">Always here to help</p>
                      </div>
                    </div>
                  ) : (
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/profile/${activeChat.otherUser.username}`}
                      className="flex items-center gap-3"
                    >
                      <Avatar
                        name={activeChat.avatarName}
                        avatarUrl={activeChat.avatarUrl}
                      />
                      <div>
                        <p className="font-semibold hover:text-vintage-rust">{activeChat.title}</p>
                        <p className="text-xs text-vintage-ink-muted">
                          @{activeChat.otherUser.username}
                          {activeChat.otherUser.last_seen_at != null &&
                            currentUser.show_last_seen !== false && (
                            <>
                              {" · "}
                              <span
                                className={
                                  isOnline(activeChat.otherUser.last_seen_at)
                                    ? "font-medium text-vintage-olive"
                                    : ""
                                }
                              >
                                {formatLastSeen(activeChat.otherUser.last_seen_at)}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </Link>
                    <UserSafetyMenu
                      profile={activeChat.otherUser}
                      currentUserId={currentUser.id}
                      onBlocked={() => {
                        setActiveChat(null);
                        void refreshConversations();
                      }}
                    />
                  </div>
                  )
                ) : (
                  <div className="flex flex-1 items-center gap-3">
                    <Avatar name={activeChat.avatarName} avatarUrl={activeChat.avatarUrl} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{activeChat.title}</p>
                      <p className="text-xs text-vintage-ink-muted">{activeChat.subtitle}</p>
                    </div>
                    {activeChat.kind === "group" &&
                      (activeChat.myRole === "owner" || activeChat.myRole === "admin") && (
                        <>
                          <button
                            type="button"
                            onClick={() => setShowPollModal(true)}
                            className="vintage-btn-outline flex items-center gap-1 px-2 py-1 text-xs"
                          >
                            <BarChart3 className="h-3.5 w-3.5" /> Poll
                          </button>
                          <button
                            type="button"
                            onClick={() => setModal("add-members")}
                            className="vintage-btn-outline flex items-center gap-1 px-2 py-1 text-xs"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add
                          </button>
                        </>
                      )}
                  </div>
                )}
                {activeChat.kind !== "channel" && (
                  <div className="ml-auto flex gap-1">
                    <button
                      type="button"
                      onClick={() => setShowMessageSearch((v) => !v)}
                      title="Search messages"
                      className="vintage-btn-outline flex h-9 w-9 items-center justify-center"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowThemeModal(true)}
                      title="Chat settings"
                      className="vintage-btn-outline flex h-9 w-9 items-center justify-center"
                    >
                      <Palette className="h-4 w-4" />
                    </button>
                    {activeChat.kind === "dm" &&
                      activeChat.otherUser &&
                      !isAssistantProfile(activeChat.otherUser) && (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowPay(true)}
                          title="Send money"
                          className="vintage-btn-outline flex h-9 w-9 items-center justify-center"
                        >
                          <DollarSign className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowGift(true)}
                          title="Send a gift"
                          className="vintage-btn-outline flex h-9 w-9 items-center justify-center"
                        >
                          <Gift className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {!isAssistantChat && (
                      <>
                        <button
                          type="button"
                          onClick={() => startCall("audio")}
                          title="Voice call"
                          className="vintage-btn-outline flex h-9 w-9 items-center justify-center"
                        >
                          <PhoneCall className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => startCall("video")}
                          title={activeChat.kind === "group" ? "Group video call" : "Video call"}
                          className="vintage-btn-outline flex h-9 w-9 items-center justify-center"
                        >
                          <Video className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </header>
              {showMessageSearch && activeChat?.convId && (
                <div className="border-b border-vintage-border bg-vintage-paper px-4 py-2">
                  <SearchWithSuggestions
                    scope="messages"
                    value={messageSearch}
                    onChange={setMessageSearch}
                    conversationId={activeChat.convId}
                    placeholder="Search in this conversation…"
                    onSuggestionSelect={(s) => {
                      if (s.href?.startsWith("#")) {
                        document
                          .getElementById(s.href.slice(1))
                          ?.scrollIntoView({ behavior: "smooth", block: "center" });
                      }
                    }}
                  />
                </div>
              )}
              {showGift && activeChat.kind === "dm" && activeChat.otherUser && (
                <GiftPickerModal
                  recipient={activeChat.otherUser}
                  context="chat"
                  conversationId={activeChat.convId}
                  onClose={() => setShowGift(false)}
                  onSent={() => loadMessages(activeChat.convId, activeChat.isSecret)}
                />
              )}
              {showPay && activeChat.kind === "dm" && activeChat.otherUser && (
                <PayInChatModal
                  recipient={activeChat.otherUser}
                  conversationId={activeChat.convId}
                  onClose={() => setShowPay(false)}
                  onSent={() => loadMessages(activeChat.convId, activeChat.isSecret)}
                />
              )}
              {showThemeModal && (
                <ChatThemeModal
                  userId={currentUser.id}
                  conversationId={activeChat.convId}
                  onClose={() => setShowThemeModal(false)}
                  onSaved={setChatTheme}
                />
              )}
              {showPollModal && activeChat.kind === "group" && (
                <CreatePollModal
                  conversationId={activeChat.convId}
                  userId={currentUser.id}
                  onClose={() => setShowPollModal(false)}
                  onCreated={() => loadMessages(activeChat.convId, activeChat.isSecret)}
                />
              )}
              {actionMessage && (
                <MessageActionSheet
                  message={actionMessage}
                  isMine={actionMessage.sender_id === currentUser.id}
                  canEdit={
                    actionMessage.sender_id === currentUser.id &&
                    (!actionMessage.message_type ||
                      actionMessage.message_type === "text") &&
                    !actionMessage.deleted_at &&
                    canEditWithinWindow(actionMessage.created_at)
                  }
                  canDeleteForEveryone={
                    actionMessage.sender_id === currentUser.id &&
                    (!actionMessage.message_type ||
                      actionMessage.message_type === "text") &&
                    !actionMessage.deleted_at &&
                    canEditWithinWindow(actionMessage.created_at)
                  }
                  onAction={handleMessageAction}
                  onClose={() => setActionMessage(null)}
                />
              )}
              {forwardingMessage && activeChat && (
                <ForwardMessageModal
                  conversations={allConversationsForForward}
                  currentConversationId={activeChat.convId}
                  preview={forwardingMessage.content}
                  onClose={() => setForwardingMessage(null)}
                  onSelect={handleForwardTo}
                />
              )}

              <div
                className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
                style={chatThemeBackgroundStyle(chatTheme)}
              >
                {loadingMsgs ? (
                  <p className="text-center text-sm text-vintage-ink-muted">Loading messages…</p>
                ) : messages.length === 0 ? (
                  <p className="py-8 text-center text-sm text-vintage-ink-muted">
                    {activeChat.kind === "channel"
                      ? "Channel updates will appear here. Only admins can post."
                      : "Say hello — you're connected on Zumelia."}
                  </p>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.sender_id === currentUser.id;
                    const sender = activeChat.members?.find((m) => m.id === msg.sender_id);
                    const isText = !msg.message_type || msg.message_type === "text";
                    const canEditMsg =
                      isMine &&
                      isText &&
                      !msg.deleted_at &&
                      canEditWithinWindow(msg.created_at);

                    return (
                      <ChatMessageBubble
                        key={msg.id}
                        msg={msg}
                        isMine={isMine}
                        currentUserId={currentUser.id}
                        activeChat={activeChat}
                        sender={sender}
                        canEditMsg={canEditMsg}
                        isEditing={editingMessageId === msg.id}
                        editMessageDraft={editMessageDraft}
                        messageEditError={messageEditError}
                        savingMessageEdit={savingMessageEdit}
                        translation={translations[msg.id]}
                        showTranslation={!!chatTheme?.translation_enabled}
                        onLongPress={setActionMessage}
                        onStartEdit={(m) => {
                          setEditingMessageId(m.id);
                          setEditMessageDraft(m.content);
                          setMessageEditError(null);
                        }}
                        onSaveEdit={handleSaveMessageEdit}
                        onCancelEdit={() => {
                          setEditingMessageId(null);
                          setMessageEditError(null);
                        }}
                        onEditDraftChange={setEditMessageDraft}
                        onReply={setReplyingTo}
                        showReadReceipt={activeChat.kind === "dm" && !!activeChat.otherUser}
                        isRead={isMessageReadByOther(msg, otherMemberReadAt)}
                      />
                    );
                  })
                )}
                {assistantThinking && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-sm vintage-card-inset px-4 py-2.5 text-sm text-vintage-ink-muted">
                      Zumelia AI is thinking…
                    </div>
                  </div>
                )}
              </div>

              {chatError ? (
                <p className="border-t border-vintage-border px-4 py-2 text-xs text-vintage-rust">
                  {chatError}
                </p>
              ) : null}

              {activeChat.canPost ? (
                <div className="border-t border-vintage-border bg-vintage-paper p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  {recordingVoice ? (
                    <VoiceRecorder
                      disabled={sendingVoice}
                      onRecorded={handleVoiceRecorded}
                      onCancel={() => setRecordingVoice(false)}
                    />
                  ) : (
                    <>
                      {replyingTo && (
                        <div className="mb-2 flex items-center justify-between gap-2 rounded-lg vintage-card-inset px-3 py-2 text-sm">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-vintage-rust">
                              Replying to{" "}
                              {replyingTo.sender_id === currentUser.id
                                ? "yourself"
                                : activeChat.members?.find((m) => m.id === replyingTo.sender_id)
                                    ?.display_name ?? "message"}
                            </p>
                            <p className="truncate text-xs text-vintage-ink-muted">
                              {replyingTo.content}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setReplyingTo(null)}
                            className="text-vintage-ink-muted hover:text-vintage-rust"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    <form onSubmit={sendMessage} className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setRecordingVoice(true)}
                        disabled={sendingVoice}
                        title="Send voice message (voicemail)"
                        className="vintage-btn-outline flex h-12 w-12 shrink-0 items-center justify-center disabled:opacity-40"
                      >
                        <Phone className="h-5 w-5" />
                      </button>
                      <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder={
                          replyingTo
                            ? "Write a reply…"
                            : activeChat.kind === "channel"
                              ? "Post an update…"
                              : "Type a message…"
                        }
                        className="vintage-input min-w-0 flex-1 px-4 py-3"
                      />
                      <button
                        type="submit"
                        disabled={!draft.trim() || sending}
                        className="vintage-btn flex h-12 w-12 shrink-0 items-center justify-center disabled:opacity-40"
                      >
                        <Send className="h-5 w-5" />
                      </button>
                    </form>
                    </>
                  )}
                  <p className="mt-1 text-[10px] text-vintage-ink-muted">
                    Mic button = voicemail · Header icons = live voice/video call
                  </p>
                </div>
              ) : (
                <div className="border-t-2 border-vintage-border bg-vintage-paper p-4 text-center text-xs text-vintage-ink-muted">
                  You are subscribed to this channel. Only admins can post updates.
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-vintage-rust to-vintage-rust-dark text-white shadow-lg">
                <Globe className="h-10 w-10" />
              </div>
              <h2 className="font-display text-xl font-bold tracking-tight">
                Connect globally on Zumelia
              </h2>
              <p className="max-w-sm text-sm text-vintage-ink-muted">
                Pick a chat, create a group or channel, or find friends by phone number.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => setModal("group")}
                  className="vintage-btn-outline px-4 py-2 text-sm"
                >
                  New group
                </button>
                <button
                  onClick={() => setTab("discover")}
                  className="vintage-btn px-4 py-2 text-sm"
                >
                  Discover people
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
      {!activeChat && <MobileBottomNav user={currentUser} />}
    </div>
  );
}
