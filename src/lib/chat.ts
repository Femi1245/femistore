import type { SupabaseClient } from "@supabase/supabase-js";
import { canEditWithinWindow } from "@/lib/edit-window";
import { ASSISTANT_USERNAME } from "@/lib/assistant";
import { acceptsBusinessContact } from "@/lib/business";
import { ensureGigThreadInboxes, isSellerGigThread } from "@/lib/chat-inbox";
import { getDmPolicyForInquiry } from "@/lib/chat-settings";
import { createDmRequest } from "@/lib/message-requests";
import { isBlocked } from "@/lib/safety";
import type {
  ActiveChat,
  ConversationKind,
  ConversationPreview,
  MemberRole,
  Message,
  MessageReplyPreview,
  Profile,
} from "./types";

export async function areMutualFriends(
  supabase: SupabaseClient,
  userId: string,
  otherUserId: string,
): Promise<boolean> {
  if (userId === otherUserId) return false;

  const [{ data: iFollow }, { data: theyFollow }] = await Promise.all([
    supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", userId)
      .eq("following_id", otherUserId)
      .maybeSingle(),
    supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", otherUserId)
      .eq("following_id", userId)
      .maybeSingle(),
  ]);

  return !!iFollow && !!theyFollow;
}

export async function loadMutualFriends(
  supabase: SupabaseClient,
  userId: string,
): Promise<Profile[]> {
  const { data: following } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);

  if (!following?.length) return [];

  const followingIds = following.map((f) => f.following_id);
  const { data: mutual } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("following_id", userId)
    .in("follower_id", followingIds);

  if (!mutual?.length) return [];

  const mutualIds = mutual.map((m) => m.follower_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", mutualIds);

  return (profiles as Profile[]) ?? [];
}

export async function canMessageUser(
  supabase: SupabaseClient,
  userId: string,
  otherUserId: string,
  options?: { businessChannel?: boolean },
): Promise<{
  allowed: boolean;
  requiresRequest?: boolean;
  asBusinessInquiry?: boolean;
  reason?: string;
}> {
  if (userId === otherUserId) {
    return { allowed: false, reason: "You cannot message yourself." };
  }

  if (await isBlocked(supabase, userId, otherUserId)) {
    return { allowed: false, reason: "Messaging is not available." };
  }

  const { data: otherProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", otherUserId)
    .maybeSingle();

  if (!otherProfile) {
    return { allowed: false, reason: "User not found." };
  }

  const other = otherProfile as Profile;

  if (other.username === ASSISTANT_USERNAME) {
    return { allowed: true };
  }

  const friends = await areMutualFriends(supabase, userId, otherUserId);
  const businessChannel = options?.businessChannel ?? false;

  if (businessChannel) {
    if (!acceptsBusinessContact(other)) {
      return { allowed: false, reason: "This business is not accepting messages." };
    }

    const policy = getDmPolicyForInquiry(other, true);
    if (policy === "nobody") {
      return { allowed: false, reason: "This business is not accepting messages." };
    }
    if (friends) return { allowed: true, asBusinessInquiry: true };
    if (policy === "friends") {
      return {
        allowed: false,
        reason: "Connect as friends first, or check the business message settings.",
      };
    }
    if (policy === "business_only" || policy === "everyone") {
      return {
        allowed: true,
        requiresRequest: policy === "everyone",
        asBusinessInquiry: true,
      };
    }
    return { allowed: false, reason: "This business is not accepting messages." };
  }

  const business = acceptsBusinessContact(other);
  const asBusinessInquiry = !friends && business;
  const policy = getDmPolicyForInquiry(other, asBusinessInquiry);

  if (policy === "nobody") {
    return { allowed: false, reason: "This user is not accepting messages." };
  }

  if (friends) return { allowed: true, asBusinessInquiry: false };

  if (policy === "friends") {
    if (business) return { allowed: true, asBusinessInquiry: true };
    return {
      allowed: false,
      reason:
        "You can only message friends. Both of you must connect (follow each other).",
    };
  }

  if (policy === "business_only") {
    if (business) return { allowed: true, asBusinessInquiry: true };
    return { allowed: false, reason: "This user only accepts business inquiries." };
  }

  // everyone — strangers use message requests
  return {
    allowed: true,
    requiresRequest: !friends && !business,
    asBusinessInquiry,
  };
}

async function addConversationMember(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
  role: MemberRole = "member",
  options?: { asPartner?: boolean },
): Promise<string | null> {
  if (options?.asPartner) {
    const { error } = await supabase.rpc("add_dm_conversation_partner", {
      p_conversation_id: conversationId,
      p_partner_id: userId,
    });
    if (error?.code === "PGRST202") {
      return "Messaging setup incomplete. Run supabase/connection-requests-messaging-fix.sql in Supabase.";
    }
    return error?.message ?? null;
  }

  const { error } = await supabase.from("conversation_members").insert({
    conversation_id: conversationId,
    user_id: userId,
    role,
  });
  return error?.message ?? null;
}

export async function findOrCreateConversation(
  supabase: SupabaseClient,
  userId: string,
  otherUserId: string,
  options?: { secret?: boolean; requestPreview?: string; businessInquiry?: boolean },
): Promise<{ convId: string | null; requiresRequest?: boolean; error?: string }> {
  const secret = options?.secret ?? false;
  const businessInquiry = options?.businessInquiry ?? false;
  const dmContext = businessInquiry ? "business" : "personal";
  const access = await canMessageUser(supabase, userId, otherUserId, {
    businessChannel: businessInquiry,
  });
  if (!access.allowed) {
    return { convId: null, error: access.reason };
  }

  const { data: myConvs } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", userId);

  const myIds = (myConvs ?? []).map((c) => c.conversation_id);

  if (myIds.length > 0) {
    const { data: shared } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", otherUserId)
      .in("conversation_id", myIds);

    const sharedIds = (shared ?? []).map((row) => row.conversation_id);
    if (sharedIds.length > 0) {
      const { data: dmConvs } = await supabase
        .from("conversations")
        .select("id")
        .in("id", sharedIds)
        .eq("kind", "dm")
        .eq("is_secret", secret)
        .eq("dm_context", dmContext)
        .limit(1);

      if (dmConvs?.[0]) {
        if (!secret && businessInquiry) {
          await ensureGigThreadInboxes(supabase, dmConvs[0].id, userId, otherUserId);
        }
        return { convId: dmConvs[0].id };
      }
    }
  }

  const { data: conv, error: convError } = await supabase
    .from("conversations")
    .insert({
      kind: "dm",
      created_by: userId,
      is_secret: secret,
      dm_context: dmContext,
    })
    .select("id")
    .single();

  if (convError || !conv) {
    return { convId: null, error: convError?.message ?? "Could not create conversation." };
  }

  const selfError = await addConversationMember(supabase, conv.id, userId, "member");
  if (selfError) return { convId: null, error: selfError };

  const otherError = await addConversationMember(supabase, conv.id, otherUserId, "member", {
    asPartner: true,
  });
  if (otherError) return { convId: null, error: otherError };

  if (access.requiresRequest) {
    await createDmRequest(
      supabase,
      conv.id,
      userId,
      otherUserId,
      options?.requestPreview ?? "New message request",
    );
  }

  if (!secret && businessInquiry) {
    await ensureGigThreadInboxes(supabase, conv.id, userId, otherUserId);
  }

  return { convId: conv.id, requiresRequest: access.requiresRequest };
}

export async function createGroup(
  supabase: SupabaseClient,
  userId: string,
  name: string,
  memberIds: string[],
): Promise<{ convId: string | null; error?: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { convId: null, error: "Group name is required." };

  const uniqueMembers = [...new Set(memberIds.filter((id) => id !== userId))];
  if (uniqueMembers.length === 0) {
    return { convId: null, error: "Add at least one friend to the group." };
  }

  for (const memberId of uniqueMembers) {
    const access = await canMessageUser(supabase, userId, memberId);
    if (!access.allowed) {
      return { convId: null, error: access.reason };
    }
  }

  const { data: conv, error: convError } = await supabase
    .from("conversations")
    .insert({
      kind: "group",
      name: trimmed,
      created_by: userId,
    })
    .select("id")
    .single();

  if (convError || !conv) {
    return { convId: null, error: convError?.message ?? "Could not create group." };
  }

  const ownerError = await addConversationMember(supabase, conv.id, userId, "owner");
  if (ownerError) return { convId: null, error: ownerError };

  for (const memberId of uniqueMembers) {
    const memberError = await addConversationMember(supabase, conv.id, memberId, "member");
    if (memberError) return { convId: null, error: memberError };
  }

  return { convId: conv.id };
}

export async function createChannel(
  supabase: SupabaseClient,
  userId: string,
  name: string,
  description: string,
  isPublic: boolean,
): Promise<{ convId: string | null; error?: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { convId: null, error: "Channel name is required." };

  const { data: conv, error: convError } = await supabase
    .from("conversations")
    .insert({
      kind: "channel",
      name: trimmed,
      description: description.trim(),
      is_public: isPublic,
      created_by: userId,
    })
    .select("id")
    .single();

  if (convError || !conv) {
    return { convId: null, error: convError?.message ?? "Could not create channel." };
  }

  const ownerError = await addConversationMember(supabase, conv.id, userId, "owner");
  if (ownerError) return { convId: null, error: ownerError };

  return { convId: conv.id };
}

export async function addGroupMembers(
  supabase: SupabaseClient,
  userId: string,
  convId: string,
  memberIds: string[],
): Promise<{ error?: string }> {
  const uniqueMembers = [...new Set(memberIds.filter((id) => id !== userId))];
  if (uniqueMembers.length === 0) return {};

  for (const memberId of uniqueMembers) {
    const access = await canMessageUser(supabase, userId, memberId);
    if (!access.allowed) return { error: access.reason };
  }

  for (const memberId of uniqueMembers) {
    const memberError = await addConversationMember(supabase, convId, memberId, "member");
    if (memberError) return { error: memberError };
  }

  return {};
}

export async function joinChannel(
  supabase: SupabaseClient,
  userId: string,
  convId: string,
): Promise<{ error?: string }> {
  const { data: conv } = await supabase
    .from("conversations")
    .select("kind, is_public")
    .eq("id", convId)
    .maybeSingle();

  if (!conv || conv.kind !== "channel" || !conv.is_public) {
    return { error: "This channel is not open to join." };
  }

  const memberError = await addConversationMember(supabase, convId, userId, "member");
  if (memberError) return { error: memberError };

  return {};
}

export async function loadPublicChannels(
  supabase: SupabaseClient,
  userId: string,
): Promise<ConversationPreview[]> {
  const { data: channels } = await supabase
    .from("conversations")
    .select("id, name, description, created_at")
    .eq("kind", "channel")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(30);

  if (!channels?.length) return [];

  const { data: memberships } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", userId);

  const joined = new Set((memberships ?? []).map((m) => m.conversation_id));

  return channels
    .filter((c) => !joined.has(c.id))
    .map((c) => ({
      id: c.id,
      kind: "channel" as ConversationKind,
      name: c.name,
      last_message: c.description || "Public channel",
      last_message_at: null,
    }));
}

async function getLastMessage(
  supabase: SupabaseClient,
  convId: string,
): Promise<{ content: string | null; created_at: string | null }> {
  const { data } = await supabase
    .from("messages")
    .select("content, created_at")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    content: data?.content ?? null,
    created_at: data?.created_at ?? null,
  };
}

export type ConversationFilter =
  | "all"
  | "regular"
  | "personal"
  | "seller"
  | "secret"
  | "archived"
  | "unread"
  | "requests";

export async function loadMemberSettingsMap(
  supabase: SupabaseClient,
  userId: string,
): Promise<Map<string, import("./types").ConversationMemberSettings>> {
  const { data } = await supabase
    .from("conversation_member_settings")
    .select("*")
    .eq("user_id", userId);

  const map = new Map<string, import("./types").ConversationMemberSettings>();
  for (const row of data ?? []) {
    map.set(row.conversation_id, row as import("./types").ConversationMemberSettings);
  }
  return map;
}

export async function searchMessages(
  supabase: SupabaseClient,
  convId: string,
  term: string,
  isSecret?: boolean,
): Promise<import("./types").Message[]> {
  const trimmed = term.trim();
  if (!trimmed) return [];

  let query = supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", convId)
    .ilike("content", `%${trimmed}%`)
    .order("created_at", { ascending: true })
    .limit(50);

  if (isSecret) {
    query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
  }

  const { data } = await query;
  return (data as import("./types").Message[]) ?? [];
}

export async function loadConversations(
  supabase: SupabaseClient,
  userId: string,
  filter: ConversationFilter = "regular",
  folderId?: string | null,
): Promise<ConversationPreview[]> {
  const { loadPendingRequestConvIds } = await import("@/lib/message-requests");
  const { loadBlockedIds } = await import("@/lib/safety");

  const pendingRequestIds = await loadPendingRequestConvIds(supabase, userId);
  const blockedIds = await loadBlockedIds(supabase, userId);

  const { data: memberships } = await supabase
    .from("conversation_members")
    .select("conversation_id, role")
    .eq("user_id", userId);

  if (!memberships?.length) return [];

  const settingsMap = await loadMemberSettingsMap(supabase, userId);
  const previews: ConversationPreview[] = [];

  for (const membership of memberships) {
    const convId = membership.conversation_id;
    const { data: conv } = await supabase
      .from("conversations")
      .select("kind, name, is_secret, dm_context, created_by")
      .eq("id", convId)
      .single();

    if (!conv) continue;

    const isSecret = !!conv.is_secret;
    const dmContext = (conv.dm_context ?? "personal") as import("./types").DmContext;
    const createdBy = conv.created_by as string | null;
    const settings = settingsMap.get(convId);
    const isArchived = settings?.is_archived ?? false;

    if (filter === "requests") {
      if (!pendingRequestIds.has(convId)) continue;
    } else if (pendingRequestIds.has(convId)) {
      continue;
    }

    if (folderId !== undefined) {
      const itemFolder = settings?.folder_id ?? null;
      if (folderId === null) {
        if (itemFolder !== null) continue;
      } else if (itemFolder !== folderId) {
        continue;
      }
    }

    if (filter === "archived") {
      if (!isArchived) continue;
    } else if (isArchived) {
      continue;
    }

    const inbox = settings?.inbox ?? "personal";
    const sellerGig = isSellerGigThread(dmContext, createdBy, userId);

    if (filter === "regular" || filter === "personal") {
      if (isSecret || sellerGig) continue;
    }
    if (filter === "seller") {
      if (isSecret || !sellerGig) continue;
    }
    if (filter === "secret" && !isSecret) continue;

    const lastMsg = await getLastMessage(supabase, convId);
    const lastRead = settings?.last_read_at;
    const isUnread =
      !!lastMsg.created_at &&
      (!lastRead || new Date(lastMsg.created_at) > new Date(lastRead));

    if (filter === "unread" && !isUnread) continue;

    const kind = (conv.kind ?? "dm") as ConversationKind;

    if (kind === "dm") {
      const { data: members } = await supabase
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", convId);

      const otherId = members?.find((m) => m.user_id !== userId)?.user_id;
      if (!otherId) continue;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", otherId)
        .single();

      if (!profile) continue;
      if (blockedIds.has(otherId)) continue;

      previews.push({
        id: convId,
        kind,
        name: null,
        is_secret: isSecret,
        dm_context: dmContext,
        other_user: profile as Profile,
        my_role: membership.role as MemberRole,
        last_message: lastMsg.content,
        last_message_at: lastMsg.created_at,
        is_pinned: settings?.is_pinned ?? false,
        is_archived: isArchived,
        is_unread: isUnread,
        folder_id: settings?.folder_id ?? null,
        inbox,
        is_pending_request: pendingRequestIds.has(convId),
      });
    } else {
      if (filter === "secret") continue;

      const { count } = await supabase
        .from("conversation_members")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", convId);

      previews.push({
        id: convId,
        kind,
        name: conv.name,
        is_secret: false,
        member_count: count ?? 0,
        my_role: membership.role as MemberRole,
        last_message: lastMsg.content,
        last_message_at: lastMsg.created_at,
        is_pinned: settings?.is_pinned ?? false,
        is_archived: isArchived,
        is_unread: isUnread,
        folder_id: settings?.folder_id ?? null,
      });
    }
  }

  previews.sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
    const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
    return tb - ta;
  });

  return previews;
}

export async function getUnreadChatCount(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { loadPendingRequests } = await import("@/lib/message-requests");
  const [unreadChats, pendingRequests] = await Promise.all([
    loadConversations(supabase, userId, "unread"),
    loadPendingRequests(supabase, userId),
  ]);
  return unreadChats.length + pendingRequests.length;
}

export async function loadActiveChat(
  supabase: SupabaseClient,
  userId: string,
  convId: string,
): Promise<ActiveChat | null> {
  const { data: conv } = await supabase
    .from("conversations")
    .select("kind, name, description, is_secret, dm_context, created_by")
    .eq("id", convId)
    .single();

  if (!conv) return null;

  const isSecret = !!conv.is_secret;
  const dmContext = (conv.dm_context ?? "personal") as import("./types").DmContext;
  const createdBy = (conv.created_by as string | null) ?? null;

  const { data: myMembership } = await supabase
    .from("conversation_members")
    .select("role")
    .eq("conversation_id", convId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!myMembership) return null;

  const kind = (conv.kind ?? "dm") as ConversationKind;
  const myRole = myMembership.role as MemberRole;
  const canPost =
    kind === "group" || kind === "dm" || myRole === "owner" || myRole === "admin";

  const { data: memberRows } = await supabase
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", convId);

  const memberIds = (memberRows ?? []).map((m) => m.user_id);
  const { data: memberProfiles } = memberIds.length
    ? await supabase.from("profiles").select("*").in("id", memberIds)
    : { data: [] };

  const members = (memberProfiles as Profile[]) ?? [];
  const otherUser = members.find((m) => m.id !== userId);

  if (kind === "dm" && otherUser) {
    return {
      convId,
      kind,
      title: otherUser.display_name,
      subtitle: isSecret
        ? "Secret chat · messages auto-delete after 24h"
        : `@${otherUser.username} · ${otherUser.country}`,
      avatarName: otherUser.display_name,
      avatarUrl: otherUser.avatar_url,
      isSecret,
      dm_context: dmContext,
      created_by: createdBy,
      isSellerGig: isSellerGigThread(dmContext, createdBy, userId),
      otherUser,
      canPost,
      members,
      myRole,
    };
  }

  if (kind === "group") {
    return {
      convId,
      kind,
      title: conv.name ?? "Group",
      subtitle: `${members.length} members`,
      avatarName: conv.name ?? "Group",
      avatarUrl: null,
      canPost,
      members,
      myRole,
    };
  }

  return {
    convId,
    kind,
    title: conv.name ?? "Channel",
    subtitle: conv.description || `${members.length} subscribers`,
    avatarName: conv.name ?? "Channel",
    avatarUrl: null,
    canPost,
    members,
    myRole,
  };
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export async function editMessage(
  supabase: SupabaseClient,
  messageId: string,
  userId: string,
  content: string,
  createdAt: string,
): Promise<{ error?: string }> {
  if (!canEditWithinWindow(createdAt)) {
    return { error: "You can only edit messages within 5 minutes of sending." };
  }

  const trimmed = content.trim();
  if (!trimmed) return { error: "Message cannot be empty." };

  const { error } = await supabase
    .from("messages")
    .update({ content: trimmed, edited_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("sender_id", userId)
    .eq("message_type", "text");

  if (error) return { error: error.message };
  return {};
}

export async function enrichMessagesWithReplies(
  supabase: SupabaseClient,
  messages: Message[],
): Promise<Message[]> {
  const replyIds = [
    ...new Set(
      messages.map((m) => m.reply_to_id).filter((id): id is string => !!id),
    ),
  ];
  if (!replyIds.length) return messages;

  const { data: parents } = await supabase
    .from("messages")
    .select("id, content, sender_id")
    .in("id", replyIds);

  if (!parents?.length) return messages;

  const senderIds = [...new Set(parents.map((p) => p.sender_id as string))];
  const { data: profiles } = await supabase.from("profiles").select("*").in("id", senderIds);
  const profileMap = new Map((profiles as Profile[])?.map((p) => [p.id, p]));

  const parentMap = new Map(
    parents.map((p) => [
      p.id as string,
      {
        id: p.id as string,
        content: p.content as string,
        sender_id: p.sender_id as string,
        sender: profileMap.get(p.sender_id as string),
      } satisfies MessageReplyPreview,
    ]),
  );

  return messages.map((m) => {
    if (!m.reply_to_id) return m;
    const reply_to = parentMap.get(m.reply_to_id) ?? null;
    return reply_to ? { ...m, reply_to } : m;
  });
}

export function attachReplyFromThread(message: Message, thread: Message[]): Message {
  if (!message.reply_to_id || message.reply_to) return message;
  const parent = thread.find((m) => m.id === message.reply_to_id);
  if (!parent) return message;
  return {
    ...message,
    reply_to: {
      id: parent.id,
      content: parent.content,
      sender_id: parent.sender_id,
    },
  };
}

export function conversationLabel(conv: ConversationPreview): string {
  if (conv.kind === "dm" && conv.other_user) {
    const name = conv.other_user.display_name;
    if (conv.is_secret) return `🔒 ${name}`;
    if (conv.dm_context === "business") {
      return `${name} · Gig`;
    }
    return name;
  }
  return conv.name ?? (conv.kind === "group" ? "Group" : "Channel");
}

/** Secret chat messages expire after 24 hours by default */
export function secretMessageExpiry(): string {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}
