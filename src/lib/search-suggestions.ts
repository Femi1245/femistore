export type SearchSuggestionScope =
  | "people"
  | "businesses"
  | "opportunities"
  | "videos"
  | "messages";

export type SearchSuggestion = {
  id: string;
  label: string;
  sublabel?: string;
  href?: string;
  avatarUrl?: string | null;
  kind: SearchSuggestionScope;
};

export async function fetchSearchSuggestions(
  q: string,
  scope: SearchSuggestionScope,
  options?: { conversationId?: string; excludeUserId?: string },
): Promise<SearchSuggestion[]> {
  const trimmed = q.trim();
  if (trimmed.length < 2) return [];

  const params = new URLSearchParams({
    q: trimmed,
    scope,
  });
  if (options?.conversationId) {
    params.set("conversationId", options.conversationId);
  }
  if (options?.excludeUserId) {
    params.set("excludeUserId", options.excludeUserId);
  }

  const res = await fetch(`/api/search/suggest?${params.toString()}`);
  if (!res.ok) return [];

  const data = (await res.json()) as { suggestions?: SearchSuggestion[] };
  return data.suggestions ?? [];
}
