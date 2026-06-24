import type { SupabaseClient } from "@supabase/supabase-js";
import { COMMENT_MAX_LENGTH } from "./content-limits";
import type { LiveChatMessage, Profile } from "./types";

export async function loadLiveChatMessages(
  supabase: SupabaseClient,
  roomName: string,
): Promise<LiveChatMessage[]> {
  const { data, error } = await supabase
    .from("live_chat_messages")
    .select("*")
    .eq("room_name", roomName)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error || !data?.length) return [];

  const userIds = [...new Set(data.map((row) => row.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", userIds);

  const profileMap = new Map((profiles as Profile[] | null)?.map((p) => [p.id, p]));

  return (data as LiveChatMessage[]).map((msg) => ({
    ...msg,
    author: profileMap.get(msg.user_id),
  }));
}

export async function sendLiveChatMessage(
  supabase: SupabaseClient,
  roomName: string,
  userId: string,
  content: string,
): Promise<{ message: LiveChatMessage | null; error?: string }> {
  const trimmed = content.trim();
  if (!trimmed) return { message: null, error: "Message is empty" };
  if (trimmed.length > COMMENT_MAX_LENGTH) {
    return {
      message: null,
      error: `Comments must be ${COMMENT_MAX_LENGTH} characters or less.`,
    };
  }

  const { data, error } = await supabase
    .from("live_chat_messages")
    .insert({
      room_name: roomName,
      user_id: userId,
      content: trimmed.slice(0, COMMENT_MAX_LENGTH),
    })
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST205") {
      return {
        message: null,
        error: "Run supabase/live-chat-schema.sql in Supabase SQL Editor first.",
      };
    }
    return { message: null, error: error.message };
  }

  return { message: data as LiveChatMessage };
}

export function formatLiveChatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
