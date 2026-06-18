import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatFolder } from "./types";

export async function loadChatFolders(
  supabase: SupabaseClient,
  userId: string,
): Promise<ChatFolder[]> {
  const { data } = await supabase
    .from("chat_folders")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  return (data as ChatFolder[]) ?? [];
}

export async function createChatFolder(
  supabase: SupabaseClient,
  userId: string,
  name: string,
): Promise<{ folder?: ChatFolder; error?: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Folder name is required." };

  const { data: existing } = await supabase
    .from("chat_folders")
    .select("sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = ((existing?.[0]?.sort_order as number) ?? -1) + 1;

  const { data, error } = await supabase
    .from("chat_folders")
    .insert({ user_id: userId, name: trimmed, sort_order: nextOrder })
    .select()
    .single();

  if (error) return { error: error.message };
  return { folder: data as ChatFolder };
}

export async function deleteChatFolder(
  supabase: SupabaseClient,
  userId: string,
  folderId: string,
): Promise<{ error?: string }> {
  await supabase
    .from("conversation_member_settings")
    .update({ folder_id: null })
    .eq("user_id", userId)
    .eq("folder_id", folderId);

  const { error } = await supabase
    .from("chat_folders")
    .delete()
    .eq("id", folderId)
    .eq("user_id", userId);

  if (error) return { error: error.message };
  return {};
}

export async function assignConversationToFolder(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
  folderId: string | null,
): Promise<{ error?: string }> {
  const { error } = await supabase.from("conversation_member_settings").upsert(
    {
      conversation_id: conversationId,
      user_id: userId,
      folder_id: folderId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "conversation_id,user_id" },
  );

  if (error) return { error: error.message };
  return {};
}

export async function setConversationNotificationsMuted(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
  muted: boolean,
): Promise<{ error?: string }> {
  const { error } = await supabase.from("conversation_member_settings").upsert(
    {
      conversation_id: conversationId,
      user_id: userId,
      notifications_muted: muted,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "conversation_id,user_id" },
  );

  if (error) return { error: error.message };
  return {};
}

export async function markConversationRead(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
): Promise<void> {
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
