import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile, VoiceRoom } from "./types";

export async function loadActiveVoiceRooms(
  supabase: SupabaseClient,
  limit = 30,
): Promise<VoiceRoom[]> {
  const { data, error } = await supabase
    .from("voice_rooms")
    .select("*, host:profiles!voice_rooms_host_id_fkey(*)")
    .eq("is_active", true)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (error.code === "PGRST205") return [];
    throw new Error(error.message);
  }

  return (data ?? []) as VoiceRoom[];
}

export async function loadVoiceRoomByName(
  supabase: SupabaseClient,
  roomName: string,
): Promise<VoiceRoom | null> {
  const { data, error } = await supabase
    .from("voice_rooms")
    .select("*, host:profiles!voice_rooms_host_id_fkey(*)")
    .eq("room_name", roomName)
    .maybeSingle();

  if (error) {
    if (error.code === "PGRST205") return null;
    throw new Error(error.message);
  }

  return (data as VoiceRoom) ?? null;
}

export function hostDisplayName(host: Profile | undefined): string {
  if (!host) return "Host";
  if (host.business_enabled && host.business_name?.trim()) {
    return host.business_name.trim();
  }
  return host.display_name;
}
