import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatInbox, ConversationMemberSettings } from "./types";

async function loadMemberSettings(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
): Promise<ConversationMemberSettings | null> {
  const { data } = await supabase
    .from("conversation_member_settings")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  return (data as ConversationMemberSettings | null) ?? null;
}

/** Gig inquiries: buyer started the chat → personal tab; seller receives → seller tab. */
export async function deriveMemberInbox(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
): Promise<ChatInbox> {
  const { data: conv } = await supabase
    .from("conversations")
    .select("dm_context, kind, created_by")
    .eq("id", conversationId)
    .maybeSingle();

  if (conv?.kind !== "dm" || conv.dm_context !== "business") {
    return "personal";
  }

  return conv.created_by === userId ? "personal" : "business";
}

export async function resolveMemberInbox(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
  existing?: ConversationMemberSettings | null,
): Promise<ChatInbox> {
  if (existing?.inbox) return existing.inbox;
  return deriveMemberInbox(supabase, userId, conversationId);
}

export function isSellerGigThread(
  dmContext: string | null | undefined,
  createdBy: string | null | undefined,
  userId: string,
): boolean {
  return dmContext === "business" && !!createdBy && createdBy !== userId;
}

export async function setConversationInbox(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
  inbox: ChatInbox,
): Promise<{ error?: string }> {
  const { error } = await supabase.from("conversation_member_settings").upsert(
    {
      conversation_id: conversationId,
      user_id: userId,
      inbox,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "conversation_id,user_id" },
  );

  if (error) {
    if (error.code === "PGRST204" || error.message.includes("inbox")) {
      return {
        error:
          "Seller inbox is not set up yet. Run supabase/seller-inbox-chat-settings.sql in Supabase.",
      };
    }
    return { error: error.message };
  }

  return {};
}

/** Keep inbox stable when updating read state, folders, themes, etc. */
export async function upsertMemberSettingsRow(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
  patch: Record<string, unknown>,
): Promise<{ error?: string }> {
  const existing = await loadMemberSettings(supabase, userId, conversationId);
  const inbox = await resolveMemberInbox(supabase, userId, conversationId, existing);

  const { error } = await supabase.from("conversation_member_settings").upsert(
    {
      conversation_id: conversationId,
      user_id: userId,
      inbox,
      updated_at: new Date().toISOString(),
      ...patch,
    },
    { onConflict: "conversation_id,user_id" },
  );

  if (error) return { error: error.message };
  return {};
}

export async function ensureGigThreadInboxes(
  supabase: SupabaseClient,
  conversationId: string,
  buyerUserId: string,
  sellerUserId: string,
): Promise<void> {
  await setConversationInbox(supabase, buyerUserId, conversationId, "personal");
  await setConversationInbox(supabase, sellerUserId, conversationId, "business");
}
