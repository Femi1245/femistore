import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile, VibeResponse } from "./types";
import { loadCloseFriendIds } from "./close-friends";

const PROMPTS = [
  "What's your vibe today?",
  "One small win from this week?",
  "What are you looking forward to?",
  "What's on your playlist right now?",
  "Something you're grateful for today?",
  "What would make your day better?",
  "A goal you're working on quietly?",
  "Who deserves a shout-out today?",
];

export function getTodaysPrompt(date = new Date()): { key: string; text: string } {
  const key = date.toISOString().slice(0, 10);
  const dayIndex =
    Math.floor(
      (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
        Date.UTC(2026, 0, 1)) /
        86400000,
    ) % PROMPTS.length;
  return { key, text: PROMPTS[dayIndex]! };
}

export async function loadMyVibeResponse(
  supabase: SupabaseClient,
  userId: string,
  promptKey: string,
): Promise<VibeResponse | null> {
  const { data } = await supabase
    .from("vibe_responses")
    .select("*")
    .eq("user_id", userId)
    .eq("prompt_key", promptKey)
    .maybeSingle();

  return (data as VibeResponse) ?? null;
}

export async function saveVibeResponse(
  supabase: SupabaseClient,
  userId: string,
  promptKey: string,
  promptText: string,
  response: string,
): Promise<{ row: VibeResponse | null; error?: string }> {
  const trimmed = response.trim();
  if (!trimmed) return { row: null, error: "Write something first." };

  const { data, error } = await supabase
    .from("vibe_responses")
    .upsert(
      {
        user_id: userId,
        prompt_key: promptKey,
        prompt_text: promptText,
        response: trimmed.slice(0, 280),
      },
      { onConflict: "user_id,prompt_key" },
    )
    .select()
    .single();

  if (error?.code === "PGRST205") {
    return { row: null, error: "Run supabase/voice-close-friends-payments-schema.sql first." };
  }
  if (error) return { row: null, error: error.message };
  return { row: data as VibeResponse };
}

export async function loadCloseFriendsVibeResponses(
  supabase: SupabaseClient,
  userId: string,
  promptKey: string,
  limit = 12,
): Promise<(VibeResponse & { author?: Profile })[]> {
  const friendIds = await loadCloseFriendIds(supabase, userId);
  const ids = [userId, ...friendIds];
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from("vibe_responses")
    .select("*")
    .eq("prompt_key", promptKey)
    .in("user_id", ids)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data?.length) return [];

  const userIds = [...new Set(data.map((r) => r.user_id as string))];
  const { data: profiles } = await supabase.from("profiles").select("*").in("id", userIds);
  const map = new Map((profiles as Profile[] | null)?.map((p) => [p.id, p]));

  return (data as VibeResponse[]).map((r) => ({
    ...r,
    author: map.get(r.user_id),
  }));
}
