import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "./types";
import { userAllowsReadReceipts } from "./read-receipts";

export async function markConversationRead(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
  profile?: Pick<Profile, "show_read_receipts">,
): Promise<void> {
  if (profile && !userAllowsReadReceipts(profile)) return;

  await supabase.from("conversation_member_settings").upsert(
    {
      conversation_id: conversationId,
      user_id: userId,
      last_read_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "conversation_id,user_id" },
  );
}
