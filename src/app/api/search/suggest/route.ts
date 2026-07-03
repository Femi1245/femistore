import { NextResponse } from "next/server";
import { searchMessages } from "@/lib/chat";
import { getBusinessProfileUrl, getPersonalProfileUrl } from "@/lib/business";
import type { SearchSuggestion, SearchSuggestionScope } from "@/lib/search-suggestions";
import { createAuthenticatedClient } from "@/lib/supabase/route-auth";
import { searchYouTubeVideos } from "@/lib/youtube";
import type { Profile } from "@/lib/types";

const SCOPES: SearchSuggestionScope[] = [
  "people",
  "businesses",
  "opportunities",
  "videos",
  "messages",
];

function escapeIlike(term: string): string {
  return term.replace(/[%_,]/g, " ");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = escapeIlike(searchParams.get("q")?.trim() ?? "");
  const scope = searchParams.get("scope") as SearchSuggestionScope | null;
  const conversationId = searchParams.get("conversationId") ?? undefined;
  const excludeUserId = searchParams.get("excludeUserId") ?? undefined;

  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  if (!scope || !SCOPES.includes(scope)) {
    return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
  }

  const { supabase, user } = await createAuthenticatedClient(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pattern = `%${q}%`;

  try {
    if (scope === "people") {
      let query = supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, country, is_verified")
        .or(
          `display_name.ilike.${pattern},username.ilike.${pattern},country.ilike.${pattern}`,
        )
        .order("display_name")
        .limit(8);

      if (excludeUserId) query = query.neq("id", excludeUserId);

      const { data } = await query;
      const suggestions: SearchSuggestion[] = ((data as Profile[]) ?? []).map((p) => ({
        id: p.id,
        label: p.display_name,
        sublabel: `@${p.username}${p.country ? ` · ${p.country}` : ""}`,
        href: getPersonalProfileUrl(p.username),
        avatarUrl: p.avatar_url,
        kind: "people",
      }));
      return NextResponse.json({ suggestions });
    }

    if (scope === "businesses") {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, business_name, business_tagline, business_category, avatar_url")
        .or("account_kind.eq.business,business_enabled.eq.true")
        .not("business_name", "is", null)
        .or(
          `business_name.ilike.${pattern},business_tagline.ilike.${pattern},business_category.ilike.${pattern},business_services.ilike.${pattern}`,
        )
        .limit(8);

      const suggestions: SearchSuggestion[] = ((data as Profile[]) ?? [])
        .filter((p) => p.business_name?.trim())
        .map((p) => ({
          id: p.id,
          label: p.business_name!,
          sublabel: [p.business_category, p.business_tagline].filter(Boolean).join(" · "),
          href: getBusinessProfileUrl(p.username),
          avatarUrl: p.avatar_url,
          kind: "businesses",
        }));
      return NextResponse.json({ suggestions });
    }

    if (scope === "opportunities") {
      const { data } = await supabase
        .from("opportunities")
        .select("id, title, service_name, location, listing_kind, category")
        .eq("is_active", true)
        .or(
          `title.ilike.${pattern},service_name.ilike.${pattern},location.ilike.${pattern},category.ilike.${pattern},description.ilike.${pattern}`,
        )
        .order("created_at", { ascending: false })
        .limit(8);

      const suggestions: SearchSuggestion[] = (data ?? []).map((row) => ({
        id: row.id as string,
        label: (row.title as string) || (row.service_name as string) || "Listing",
        sublabel: [
          row.listing_kind === "offering" ? "Service" : "Hiring",
          row.location as string,
          row.category as string,
        ]
          .filter(Boolean)
          .join(" · "),
        href: `/opportunities/${row.id as string}`,
        kind: "opportunities",
      }));
      return NextResponse.json({ suggestions });
    }

    if (scope === "videos") {
      const videos = await searchYouTubeVideos(q);
      const suggestions: SearchSuggestion[] = videos.slice(0, 6).map((v) => ({
        id: v.id,
        label: v.title,
        sublabel: v.channelTitle,
        href: `/watch/${v.id}`,
        avatarUrl: v.thumbnailUrl,
        kind: "videos",
      }));
      return NextResponse.json({ suggestions });
    }

    if (scope === "messages") {
      if (!conversationId) {
        return NextResponse.json({ suggestions: [] });
      }

      const hits = await searchMessages(supabase, conversationId, q, false);
      const suggestions: SearchSuggestion[] = hits.slice(0, 8).map((m) => ({
        id: m.id,
        label: m.content.length > 80 ? `${m.content.slice(0, 80)}…` : m.content,
        sublabel: "Message in this chat",
        href: `#msg-${m.id}`,
        kind: "messages",
      }));
      return NextResponse.json({ suggestions });
    }

    return NextResponse.json({ suggestions: [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json({ error: message, suggestions: [] }, { status: 500 });
  }
}
