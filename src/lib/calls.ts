import type { SupabaseClient } from "@supabase/supabase-js";
import type { CallSession, CallType } from "./types";

export async function isConversationMember(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

export async function canStartCall(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
): Promise<{ allowed: boolean; error?: string }> {
  const { data: conv } = await supabase
    .from("conversations")
    .select("kind")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conv) return { allowed: false, error: "Conversation not found." };
  if (conv.kind === "channel") {
    return { allowed: false, error: "Calls are not available in channels." };
  }

  const member = await isConversationMember(supabase, userId, conversationId);
  if (!member) return { allowed: false, error: "You are not in this conversation." };

  const { data: active } = await supabase
    .from("call_sessions")
    .select("id")
    .eq("conversation_id", conversationId)
    .in("status", ["ringing", "active"])
    .limit(1);

  if (active?.length) {
    return { allowed: false, error: "A call is already in progress." };
  }

  return { allowed: true };
}

export async function loadCallSession(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<CallSession | null> {
  const { data } = await supabase
    .from("call_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  return (data as CallSession) ?? null;
}

export function formatCallDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function callTypeLabel(type: CallType): string {
  return type === "video" ? "Video call" : "Voice call";
}
