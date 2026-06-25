import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConnectionRequest, Profile } from "./types";

export type ConnectionStatus =
  | "none"
  | "friends"
  | "outgoing_pending"
  | "incoming_pending";

export async function getConnectionStatus(
  supabase: SupabaseClient,
  userId: string,
  otherUserId: string,
): Promise<ConnectionStatus> {
  const { areMutualFriends } = await import("@/lib/chat");
  if (await areMutualFriends(supabase, userId, otherUserId)) {
    return "friends";
  }

  const { data: outgoing } = await supabase
    .from("connection_requests")
    .select("id")
    .eq("from_user_id", userId)
    .eq("to_user_id", otherUserId)
    .eq("status", "pending")
    .maybeSingle();

  if (outgoing) return "outgoing_pending";

  const { data: incoming } = await supabase
    .from("connection_requests")
    .select("id")
    .eq("from_user_id", otherUserId)
    .eq("to_user_id", userId)
    .eq("status", "pending")
    .maybeSingle();

  if (incoming) return "incoming_pending";

  return "none";
}

export async function sendConnectionRequest(
  supabase: SupabaseClient,
  fromUserId: string,
  toUserId: string,
): Promise<{ error?: string }> {
  const { error } = await supabase.from("connection_requests").upsert(
    {
      from_user_id: fromUserId,
      to_user_id: toUserId,
      status: "pending",
    },
    { onConflict: "from_user_id,to_user_id" },
  );

  if (error) {
    if (error.code === "PGRST205") {
      return {
        error:
          "Connection requests are not set up yet. Run supabase/connection-requests-messaging-fix.sql in Supabase.",
      };
    }
    return { error: error.message };
  }

  return {};
}

export async function loadIncomingConnectionRequests(
  supabase: SupabaseClient,
  userId: string,
): Promise<ConnectionRequest[]> {
  const { data } = await supabase
    .from("connection_requests")
    .select("*")
    .eq("to_user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as ConnectionRequest[];
  if (!rows.length) return [];

  const senderIds = [...new Set(rows.map((r) => r.from_user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", senderIds);

  const map = new Map((profiles as Profile[])?.map((p) => [p.id, p]));
  return rows.map((r) => ({ ...r, from_user: map.get(r.from_user_id) }));
}

export async function acceptConnectionRequest(
  supabase: SupabaseClient,
  requestId: string,
): Promise<{ error?: string }> {
  const { error } = await supabase.rpc("accept_connection_request", {
    p_request_id: requestId,
  });

  if (error) {
    if (error.code === "PGRST202") {
      return {
        error:
          "Connection accept is not set up yet. Run supabase/connection-requests-messaging-fix.sql in Supabase.",
      };
    }
    return { error: error.message };
  }

  return {};
}

export async function declineConnectionRequest(
  supabase: SupabaseClient,
  requestId: string,
  userId: string,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("connection_requests")
    .update({ status: "declined" })
    .eq("id", requestId)
    .eq("to_user_id", userId);

  if (error) return { error: error.message };
  return {};
}

export async function getIncomingConnectionRequest(
  supabase: SupabaseClient,
  userId: string,
  fromUserId: string,
): Promise<ConnectionRequest | null> {
  const { data } = await supabase
    .from("connection_requests")
    .select("*")
    .eq("to_user_id", userId)
    .eq("from_user_id", fromUserId)
    .eq("status", "pending")
    .maybeSingle();

  return (data as ConnectionRequest) ?? null;
}
