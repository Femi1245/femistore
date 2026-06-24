import type { SupabaseClient } from "@supabase/supabase-js";
import type { LiveJoinRequest, LiveStreamViewer, Profile } from "./types";

const VIEWER_STALE_MS = 90_000;

export async function heartbeatLiveViewer(
  supabase: SupabaseClient,
  roomName: string,
  userId: string,
): Promise<void> {
  const now = new Date().toISOString();
  await supabase.from("live_stream_viewers").upsert(
    {
      room_name: roomName,
      user_id: userId,
      last_seen_at: now,
      joined_at: now,
    },
    { onConflict: "room_name,user_id" },
  );
}

export async function loadLiveViewers(
  supabase: SupabaseClient,
  roomName: string,
): Promise<LiveStreamViewer[]> {
  const cutoff = new Date(Date.now() - VIEWER_STALE_MS).toISOString();
  const { data, error } = await supabase
    .from("live_stream_viewers")
    .select("*, profile:profiles(*)")
    .eq("room_name", roomName)
    .gte("last_seen_at", cutoff)
    .order("last_seen_at", { ascending: false });

  if (error) {
    if (error.code === "PGRST205") return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    room_name: row.room_name,
    user_id: row.user_id,
    joined_at: row.joined_at,
    last_seen_at: row.last_seen_at,
    profile: row.profile as Profile | undefined,
  }));
}

export async function requestJoinLiveStage(
  supabase: SupabaseClient,
  roomName: string,
  userId: string,
): Promise<{ error?: string }> {
  const { error } = await supabase.from("live_stream_join_requests").insert({
    room_name: roomName,
    user_id: userId,
    request_type: "request",
    status: "pending",
  });

  if (error) {
    if (error.code === "PGRST205") {
      return { error: "Run supabase/live-stage-schema.sql in Supabase SQL Editor first." };
    }
    if (error.code === "23505") {
      return { error: "You already have a pending request." };
    }
    return { error: error.message };
  }
  return {};
}

export async function inviteToLiveStage(
  supabase: SupabaseClient,
  roomName: string,
  hostId: string,
  inviteUserId: string,
): Promise<{ error?: string }> {
  const { data: stream } = await supabase
    .from("live_streams")
    .select("host_id")
    .eq("room_name", roomName)
    .eq("is_live", true)
    .maybeSingle();

  if (!stream || stream.host_id !== hostId) {
    return { error: "Only the host can invite guests." };
  }

  if (inviteUserId === hostId) {
    return { error: "You are already hosting." };
  }

  const { error: guestError } = await supabase.from("live_stream_guests").upsert(
    {
      room_name: roomName,
      user_id: inviteUserId,
      invited_by: hostId,
      status: "active",
    },
    { onConflict: "room_name,user_id" },
  );

  if (guestError) {
    if (guestError.code === "PGRST205") {
      return { error: "Run supabase/live-stage-schema.sql in Supabase SQL Editor first." };
    }
    return { error: guestError.message };
  }

  await supabase
    .from("live_stream_join_requests")
    .update({ status: "approved", responded_at: new Date().toISOString() })
    .eq("room_name", roomName)
    .eq("user_id", inviteUserId)
    .eq("status", "pending");

  return {};
}

export async function respondJoinRequest(
  supabase: SupabaseClient,
  requestId: string,
  hostId: string,
  approve: boolean,
): Promise<{ error?: string }> {
  const { data: req, error: fetchError } = await supabase
    .from("live_stream_join_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (fetchError || !req) {
    return { error: fetchError?.message ?? "Request not found." };
  }

  const { data: stream } = await supabase
    .from("live_streams")
    .select("host_id, room_name")
    .eq("room_name", req.room_name)
    .maybeSingle();

  if (!stream || stream.host_id !== hostId) {
    return { error: "Only the host can respond." };
  }

  const status = approve ? "approved" : "declined";
  const { error: updateError } = await supabase
    .from("live_stream_join_requests")
    .update({ status, responded_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("status", "pending");

  if (updateError) return { error: updateError.message };

  if (approve) {
    const { error: guestError } = await supabase.from("live_stream_guests").upsert(
      {
        room_name: stream.room_name,
        user_id: req.user_id,
        invited_by: hostId,
        status: "active",
      },
      { onConflict: "room_name,user_id" },
    );
    if (guestError) return { error: guestError.message };
  }

  return {};
}

export async function loadPendingJoinRequests(
  supabase: SupabaseClient,
  roomName: string,
): Promise<LiveJoinRequest[]> {
  const { data, error } = await supabase
    .from("live_stream_join_requests")
    .select("*, profile:profiles(*)")
    .eq("room_name", roomName)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    if (error.code === "PGRST205") return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => normalizeJoinRequest(row));
}

export async function loadMyJoinRequest(
  supabase: SupabaseClient,
  roomName: string,
  userId: string,
): Promise<LiveJoinRequest | null> {
  const { data, error } = await supabase
    .from("live_stream_join_requests")
    .select("*")
    .eq("room_name", roomName)
    .eq("user_id", userId)
    .eq("status", "pending")
    .maybeSingle();

  if (error || !data) return null;
  return normalizeJoinRequest(data);
}

export async function isLiveStageGuest(
  supabase: SupabaseClient,
  roomName: string,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("live_stream_guests")
    .select("user_id")
    .eq("room_name", roomName)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  return !!data;
}

function normalizeJoinRequest(row: Record<string, unknown>): LiveJoinRequest {
  return {
    id: row.id as string,
    room_name: row.room_name as string,
    user_id: row.user_id as string,
    request_type: row.request_type as LiveJoinRequest["request_type"],
    status: row.status as LiveJoinRequest["status"],
    created_at: row.created_at as string,
    responded_at: (row.responded_at as string | null) ?? null,
    profile: row.profile as Profile | undefined,
  };
}
