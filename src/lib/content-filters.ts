import type { SupabaseClient } from "@supabase/supabase-js";
import type { KeywordMute, Post } from "./types";

export async function loadKeywordMutes(
  supabase: SupabaseClient,
  userId: string,
): Promise<KeywordMute[]> {
  const { data } = await supabase
    .from("keyword_mutes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return (data as KeywordMute[]) ?? [];
}

export async function addKeywordMute(
  supabase: SupabaseClient,
  userId: string,
  keyword: string,
): Promise<{ error?: string }> {
  const trimmed = keyword.trim().toLowerCase();
  if (!trimmed || trimmed.length < 2) {
    return { error: "Keyword must be at least 2 characters." };
  }

  const { error } = await supabase.from("keyword_mutes").upsert({
    user_id: userId,
    keyword: trimmed,
  });

  if (error) return { error: error.message };
  return {};
}

export async function removeKeywordMute(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("keyword_mutes")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return { error: error.message };
  return {};
}

export function postMatchesKeywordMutes(
  post: Post,
  keywords: string[],
): boolean {
  if (!keywords.length) return false;
  const haystack = `${post.content} ${post.author?.display_name ?? ""} ${post.author?.username ?? ""}`.toLowerCase();
  return keywords.some((k) => haystack.includes(k));
}

export function filterPostsByKeywords<T extends Post>(
  posts: T[],
  keywords: string[],
): T[] {
  if (!keywords.length) return posts;
  return posts.filter((p) => !postMatchesKeywordMutes(p, keywords));
}
