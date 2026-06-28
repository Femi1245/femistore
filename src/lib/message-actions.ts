import type { SupabaseClient } from "@supabase/supabase-js";
import { canEditWithinWindow } from "@/lib/edit-window";

export const DELETED_MESSAGE_PLACEHOLDER = "This message was deleted";

export async function loadHiddenMessageIds(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
): Promise<Set<string>> {
  const { data: msgs } = await supabase
    .from("messages")
    .select("id")
    .eq("conversation_id", conversationId);

  const msgIds = (msgs ?? []).map((m) => m.id as string);
  if (!msgIds.length) return new Set();

  const { data, error } = await supabase
    .from("hidden_messages")
    .select("message_id")
    .eq("user_id", userId)
    .in("message_id", msgIds);

  if (error?.message?.includes("hidden_messages")) {
    return new Set();
  }

  return new Set((data ?? []).map((row) => row.message_id as string));
}

export async function hideMessageForMe(
  supabase: SupabaseClient,
  userId: string,
  messageId: string,
): Promise<{ error?: string }> {
  const { error } = await supabase.from("hidden_messages").upsert(
    { user_id: userId, message_id: messageId },
    { onConflict: "user_id,message_id" },
  );

  if (error?.message?.includes("hidden_messages")) {
    return {
      error: "Message actions not set up. Run supabase/message-actions-schema.sql in Supabase.",
    };
  }
  if (error) return { error: error.message };
  return {};
}

export async function deleteMessageForEveryone(
  supabase: SupabaseClient,
  userId: string,
  messageId: string,
  createdAt: string,
): Promise<{ error?: string }> {
  if (!canEditWithinWindow(createdAt)) {
    return { error: "You can only delete for everyone within 5 minutes of sending." };
  }

  const { error } = await supabase
    .from("messages")
    .update({
      content: DELETED_MESSAGE_PLACEHOLDER,
      deleted_at: new Date().toISOString(),
    })
    .eq("id", messageId)
    .eq("sender_id", userId)
    .eq("message_type", "text");

  if (error?.message?.includes("deleted_at")) {
    return {
      error: "Message delete not set up. Run supabase/message-actions-schema.sql in Supabase.",
    };
  }
  if (error) return { error: error.message };
  return {};
}

export async function forwardMessage(
  supabase: SupabaseClient,
  userId: string,
  targetConversationId: string,
  content: string,
): Promise<{ error?: string }> {
  const trimmed = content.trim();
  if (!trimmed) return { error: "Nothing to forward." };

  const { data: membership } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("conversation_id", targetConversationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership) return { error: "You are not in that conversation." };

  const { error } = await supabase.from("messages").insert({
    conversation_id: targetConversationId,
    sender_id: userId,
    content: trimmed.slice(0, 4000),
    message_type: "text",
  });

  if (error) return { error: error.message };
  return {};
}

export async function translateMessageText(
  text: string,
  targetLang: string,
): Promise<{ translated?: string; error?: string }> {
  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, targetLang }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      return { error: data.error ?? "Translation failed." };
    }
    const data = (await res.json()) as { translated?: string };
    return { translated: data.translated };
  } catch {
    return { error: "Translation failed." };
  }
}
