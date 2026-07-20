import type { SupabaseClient } from "@supabase/supabase-js";
import type { Message, Profile } from "./types";

export type ConversationReadCursor = {
  userId: string;
  lastReadAt: string;
};

/** Fetch read cursors for other members (respects their show_read_receipts via RPC). */
export async function loadConversationReadCursors(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<ConversationReadCursor[]> {
  const { data, error } = await supabase.rpc("get_conversation_read_cursors", {
    p_conversation_id: conversationId,
  });

  if (error) {
    if (error.message.includes("get_conversation_read_cursors")) return [];
    console.warn("[read-receipts]", error.message);
    return [];
  }

  return (data ?? []).map((row: { user_id: string; last_read_at: string }) => ({
    userId: row.user_id,
    lastReadAt: row.last_read_at,
  }));
}

/** In a DM, the other person's read watermark (if any). */
export function otherMemberReadAt(
  cursors: ConversationReadCursor[],
  otherUserId: string | undefined,
): string | null {
  if (!otherUserId) return null;
  return cursors.find((c) => c.userId === otherUserId)?.lastReadAt ?? null;
}

export function isMessageReadByOther(
  message: Pick<Message, "created_at">,
  otherLastReadAt: string | null | undefined,
): boolean {
  if (!otherLastReadAt) return false;
  return new Date(message.created_at).getTime() <= new Date(otherLastReadAt).getTime();
}

export function userAllowsReadReceipts(profile: Pick<Profile, "show_read_receipts">): boolean {
  return profile.show_read_receipts !== false;
}
