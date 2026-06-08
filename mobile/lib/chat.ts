import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConversationPreview, Profile } from "./types";

export async function findOrCreateConversation(
  supabase: SupabaseClient,
  userId: string,
  otherUserId: string,
): Promise<string | null> {
  const { data: myConvs } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", userId);

  const myIds = (myConvs ?? []).map((c) => c.conversation_id);

  if (myIds.length > 0) {
    const { data: shared } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", otherUserId)
      .in("conversation_id", myIds);

    if (shared && shared.length > 0) {
      return shared[0].conversation_id;
    }
  }

  const { data: conv, error: convError } = await supabase
    .from("conversations")
    .insert({})
    .select("id")
    .single();

  if (convError || !conv) return null;

  const { error: membersError } = await supabase
    .from("conversation_members")
    .insert([
      { conversation_id: conv.id, user_id: userId },
      { conversation_id: conv.id, user_id: otherUserId },
    ]);

  if (membersError) return null;
  return conv.id;
}

export async function loadConversations(
  supabase: SupabaseClient,
  userId: string,
): Promise<ConversationPreview[]> {
  const { data: memberships } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", userId);

  if (!memberships?.length) return [];

  const convIds = memberships.map((m) => m.conversation_id);
  const previews: ConversationPreview[] = [];

  for (const convId of convIds) {
    const { data: members } = await supabase
      .from("conversation_members")
      .select("user_id")
      .eq("conversation_id", convId);

    const otherId = members?.find((m) => m.user_id !== userId)?.user_id;
    if (!otherId) continue;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", otherId)
      .single();

    if (!profile) continue;

    const { data: lastMsg } = await supabase
      .from("messages")
      .select("content, created_at")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    previews.push({
      id: convId,
      other_user: profile as Profile,
      last_message: lastMsg?.content ?? null,
      last_message_at: lastMsg?.created_at ?? null,
    });
  }

  previews.sort((a, b) => {
    const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
    const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
    return tb - ta;
  });

  return previews;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}
