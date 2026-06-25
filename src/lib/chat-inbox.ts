import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatInbox } from "./types";

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
