import type { SupabaseClient } from "@supabase/supabase-js";
import type { DmRequest, Profile } from "./types";

export async function createDmRequest(
  supabase: SupabaseClient,
  conversationId: string,
  fromUserId: string,
  toUserId: string,
  preview: string,
): Promise<{ error?: string }> {
  const { error } = await supabase.from("dm_requests").upsert(
    {
      conversation_id: conversationId,
      from_user_id: fromUserId,
      to_user_id: toUserId,
      preview: preview.slice(0, 200),
      status: "pending",
    },
    { onConflict: "conversation_id,to_user_id" },
  );

  if (error) return { error: error.message };
  return {};
}

export async function loadPendingRequests(
  supabase: SupabaseClient,
  userId: string,
): Promise<DmRequest[]> {
  const { data } = await supabase
    .from("dm_requests")
    .select("*")
    .eq("to_user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as DmRequest[];
  if (!rows.length) return [];

  const senderIds = [...new Set(rows.map((r) => r.from_user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", senderIds);

  const map = new Map((profiles as Profile[])?.map((p) => [p.id, p]));

  return rows.map((r) => ({ ...r, from_user: map.get(r.from_user_id) }));
}

export async function loadPendingRequestConvIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<Set<string>> {
  const { data } = await supabase
    .from("dm_requests")
    .select("conversation_id")
    .eq("to_user_id", userId)
    .eq("status", "pending");

  return new Set((data ?? []).map((r) => r.conversation_id as string));
}

export async function respondToRequest(
  supabase: SupabaseClient,
  requestId: string,
  userId: string,
  accept: boolean,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("dm_requests")
    .update({ status: accept ? "accepted" : "declined" })
    .eq("id", requestId)
    .eq("to_user_id", userId);

  if (error) return { error: error.message };
  return {};
}
