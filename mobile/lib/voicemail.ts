import type { SupabaseClient } from "@supabase/supabase-js";
import { uploadMediaFromUri } from "./storage";
import type { Message } from "./types";

export async function sendVoiceMessageFromUri(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
  uri: string,
  durationSeconds: number,
  expiresAt?: string | null,
): Promise<{ message: Message | null; error?: string }> {
  const uploaded = await uploadMediaFromUri(
    supabase,
    "voice-messages",
    userId,
    uri,
    "audio/m4a",
    conversationId,
  );

  if (!uploaded.url) {
    return { message: null, error: uploaded.error ?? "Upload failed." };
  }

  const label = `Voice message (${Math.max(1, Math.round(durationSeconds))}s)`;

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: userId,
      content: label,
      message_type: "voice",
      media_url: uploaded.url,
      media_duration_seconds: Math.round(durationSeconds),
      ...(expiresAt ? { expires_at: expiresAt } : {}),
    })
    .select()
    .single();

  if (error) return { message: null, error: error.message };
  return { message: data as Message };
}
