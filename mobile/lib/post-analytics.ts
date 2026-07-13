import type { SupabaseClient } from "@supabase/supabase-js";
import type { PostAnalytics, PostViewDay, Profile } from "./types";

type PostViewRow = {
  post_id: string;
  viewer_id: string;
  viewed_at: string;
};

/** Record a unique view (upsert). Skips when the viewer is the author. */
export async function markPostViewed(
  supabase: SupabaseClient,
  postId: string,
  viewerId: string,
  authorId: string,
): Promise<void> {
  if (!postId || !viewerId || viewerId === authorId) return;

  const { error } = await supabase.from("post_views").upsert(
    {
      post_id: postId,
      viewer_id: viewerId,
      viewed_at: new Date().toISOString(),
    },
    { onConflict: "post_id,viewer_id" },
  );

  if (error && error.code !== "PGRST205") {
    console.error("[post-analytics] markPostViewed:", error.message);
  }
}

function buildViewDays(views: PostViewRow[], days = 7): PostViewDay[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }

  for (const view of views) {
    const key = view.viewed_at.slice(0, 10);
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }

  return [...buckets.entries()].map(([date, viewsCount]) => ({
    date,
    views: viewsCount,
  }));
}

/**
 * Owner-only analytics for a post. Returns null if the post is missing
 * or the caller is not the author (RLS will also hide views).
 */
export async function loadPostAnalytics(
  supabase: SupabaseClient,
  postId: string,
  ownerId: string,
): Promise<PostAnalytics | null> {
  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, user_id, created_at")
    .eq("id", postId)
    .maybeSingle();

  if (postError || !post || post.user_id !== ownerId) {
    return null;
  }

  const [viewsRes, likesRes, commentsRes, resharesRes] = await Promise.all([
    supabase
      .from("post_views")
      .select("post_id, viewer_id, viewed_at")
      .eq("post_id", postId)
      .order("viewed_at", { ascending: false }),
    supabase
      .from("post_likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId),
    supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId),
    supabase
      .from("post_reshares")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId),
  ]);

  if (viewsRes.error?.code === "PGRST205") {
    return {
      postId,
      views: 0,
      likes: likesRes.count ?? 0,
      comments: commentsRes.count ?? 0,
      reshares: resharesRes.count ?? 0,
      engagementRate: 0,
      viewsByDay: buildViewDays([]),
      recentViewers: [],
      schemaMissing: true,
    };
  }

  const viewRows = (viewsRes.data as PostViewRow[] | null) ?? [];
  const views = viewRows.length;
  const likes = likesRes.count ?? 0;
  const comments = commentsRes.count ?? 0;
  const reshares = resharesRes.count ?? 0;
  const interactions = likes + comments + reshares;
  const engagementRate =
    views > 0 ? Math.round((interactions / views) * 1000) / 10 : 0;

  const viewerIds = [...new Set(viewRows.slice(0, 24).map((v) => v.viewer_id))];
  let profileMap = new Map<string, Profile>();
  if (viewerIds.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("id", viewerIds);
    profileMap = new Map(
      ((profiles as Profile[] | null) ?? []).map((p) => [p.id, p]),
    );
  }

  const recentViewers = viewRows.slice(0, 12).map((v) => ({
    viewerId: v.viewer_id,
    viewedAt: v.viewed_at,
    profile: profileMap.get(v.viewer_id),
  }));

  return {
    postId,
    views,
    likes,
    comments,
    reshares,
    engagementRate,
    viewsByDay: buildViewDays(viewRows),
    recentViewers,
    schemaMissing: false,
  };
}
