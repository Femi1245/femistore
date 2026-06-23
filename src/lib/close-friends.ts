import type { SupabaseClient } from "@supabase/supabase-js";
import { areMutualFriends } from "./chat";

export async function isCloseFriend(
  supabase: SupabaseClient,
  userId: string,
  friendId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("close_friends")
    .select("friend_id")
    .eq("user_id", userId)
    .eq("friend_id", friendId)
    .maybeSingle();

  return !!data;
}

export async function loadCloseFriendIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("close_friends")
    .select("friend_id")
    .eq("user_id", userId);

  if (error) {
    if (error.code === "PGRST205") return [];
    return [];
  }

  return (data ?? []).map((r) => r.friend_id as string);
}

export async function toggleCloseFriend(
  supabase: SupabaseClient,
  userId: string,
  friendId: string,
): Promise<{ isClose: boolean; error?: string }> {
  if (userId === friendId) {
    return { isClose: false, error: "You cannot add yourself." };
  }

  const mutual = await areMutualFriends(supabase, userId, friendId);
  if (!mutual) {
    return { isClose: false, error: "Close friends must be mutual connections first." };
  }

  const already = await isCloseFriend(supabase, userId, friendId);
  if (already) {
    const { error } = await supabase
      .from("close_friends")
      .delete()
      .eq("user_id", userId)
      .eq("friend_id", friendId);
    if (error?.code === "PGRST205") {
      return { isClose: false, error: "Run supabase/voice-close-friends-payments-schema.sql first." };
    }
    if (error) return { isClose: true, error: error.message };
    return { isClose: false };
  }

  const { error } = await supabase.from("close_friends").insert({
    user_id: userId,
    friend_id: friendId,
  });

  if (error?.code === "PGRST205") {
    return { isClose: false, error: "Run supabase/voice-close-friends-payments-schema.sql first." };
  }
  if (error) return { isClose: false, error: error.message };
  return { isClose: true };
}
