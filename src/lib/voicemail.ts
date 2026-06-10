import type { SupabaseClient } from "@supabase/supabase-js";
import { uploadMedia } from "./storage";
import type { Message } from "./types";

export async function sendVoiceMessage(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
  blob: Blob,
  durationSeconds: number,
  expiresAt?: string | null,
): Promise<{ message: Message | null; error?: string }> {
  const file = new File([blob], `voice-${Date.now()}.webm`, {
    type: blob.type || "audio/webm",
  });

  const { url, error: uploadError } = await uploadMedia(
    supabase,
    "voice-messages",
    userId,
    file,
    conversationId,
  );

  if (uploadError || !url) {
    return { message: null, error: uploadError ?? "Upload failed." };
  }

  const label =
    durationSeconds > 0
      ? `Voice message (${Math.max(1, Math.round(durationSeconds))}s)`
      : "Voice message";

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: userId,
      content: label,
      message_type: "voice",
      media_url: url,
      media_duration_seconds: Math.round(durationSeconds),
      ...(expiresAt ? { expires_at: expiresAt } : {}),
    })
    .select()
    .single();

  if (error) return { message: null, error: error.message };
  return { message: data as Message };
}
