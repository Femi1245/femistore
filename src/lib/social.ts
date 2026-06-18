import type { SupabaseClient } from "@supabase/supabase-js";
import { canEditWithinWindow } from "@/lib/edit-window";
import type {
  Comment,
  FollowCounts,
  Post,
  PostEngagement,
  PostWithMeta,
  Profile,
} from "./types";

export async function getFollowCounts(
  supabase: SupabaseClient,
  userId: string,
): Promise<FollowCounts> {
  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", userId),
  ]);

  return {
    followers: followers ?? 0,
    following: following ?? 0,
  };
}

export async function loadSuggestedProfiles(
  supabase: SupabaseClient,
  userId: string,
  limit = 4,
): Promise<Profile[]> {
  const { data: followingRows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);

  const excludeIds = [
    userId,
    ...((followingRows as { following_id: string }[] | null)?.map(
      (r) => r.following_id,
    ) ?? []),
  ];

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .not("id", "in", `(${excludeIds.join(",")})`)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data as Profile[]) ?? [];
}

export async function isFollowing(
  supabase: SupabaseClient,
  followerId: string,
  followingId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();

  return !!data;
}

export async function toggleFollow(
  supabase: SupabaseClient,
  followerId: string,
  followingId: string,
): Promise<boolean> {
  const already = await isFollowing(supabase, followerId, followingId);

  if (already) {
    await supabase
      .from("follows")
      .delete()
      .eq("follower_id", followerId)
      .eq("following_id", followingId);
    return false;
  }

  await supabase.from("follows").insert({
    follower_id: followerId,
    following_id: followingId,
  });
  return true;
}

async function attachAuthors(
  supabase: SupabaseClient,
  posts: Post[],
): Promise<Post[]> {
  if (!posts.length) return [];

  const userIds = [...new Set(posts.map((p) => p.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", userIds);

  const map = new Map((profiles as Profile[] | null)?.map((p) => [p.id, p]));

  const reshareIds = posts
    .filter((p) => p.reshare_of)
    .map((p) => p.reshare_of as string);

  let originalMap = new Map<string, Post>();
  if (reshareIds.length) {
    const { data: originals } = await supabase
      .from("posts")
      .select("*")
      .in("id", reshareIds);

    const withAuthors = await attachAuthors(
      supabase,
      (originals as Post[]) ?? [],
    );
    originalMap = new Map(withAuthors.map((p) => [p.id, p]));
  }

  return posts.map((p) => ({
    ...p,
    author: map.get(p.user_id),
    original_post: p.reshare_of ? originalMap.get(p.reshare_of) ?? null : null,
  }));
}

export async function getEngagement(
  supabase: SupabaseClient,
  postIds: string[],
  currentUserId: string,
): Promise<Map<string, PostEngagement>> {
  const result = new Map<string, PostEngagement>();
  if (!postIds.length) return result;

  const [likes, comments, reshares, myLikes, myReshares] = await Promise.all([
    supabase.from("post_likes").select("post_id").in("post_id", postIds),
    supabase.from("comments").select("post_id").in("post_id", postIds),
    supabase.from("post_reshares").select("post_id").in("post_id", postIds),
    supabase
      .from("post_likes")
      .select("post_id")
      .in("post_id", postIds)
      .eq("user_id", currentUserId),
    supabase
      .from("post_reshares")
      .select("post_id")
      .in("post_id", postIds)
      .eq("user_id", currentUserId),
  ]);

  const countBy = (rows: { post_id: string }[] | null) => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) {
      m.set(r.post_id, (m.get(r.post_id) ?? 0) + 1);
    }
    return m;
  };

  const likeCounts = countBy(likes.data as { post_id: string }[]);
  const commentCounts = countBy(comments.data as { post_id: string }[]);
  const reshareCounts = countBy(reshares.data as { post_id: string }[]);
  const myLikeSet = new Set(
    (myLikes.data as { post_id: string }[])?.map((r) => r.post_id),
  );
  const myReshareSet = new Set(
    (myReshares.data as { post_id: string }[])?.map((r) => r.post_id),
  );

  for (const id of postIds) {
    result.set(id, {
      likes: likeCounts.get(id) ?? 0,
      comments: commentCounts.get(id) ?? 0,
      reshares: reshareCounts.get(id) ?? 0,
      liked_by_me: myLikeSet.has(id),
      reshared_by_me: myReshareSet.has(id),
    });
  }

  return result;
}

export async function enrichPosts(
  supabase: SupabaseClient,
  posts: Post[],
  currentUserId: string,
): Promise<PostWithMeta[]> {
  const withAuthors = await attachAuthors(supabase, posts);
  const engagement = await getEngagement(
    supabase,
    withAuthors.map((p) => p.id),
    currentUserId,
  );

  return withAuthors.map((p) => ({
    ...p,
    engagement: engagement.get(p.id) ?? {
      likes: 0,
      comments: 0,
      reshares: 0,
      liked_by_me: false,
      reshared_by_me: false,
    },
  }));
}

export type FeedMode = "friends" | "following";

export async function loadFeed(
  supabase: SupabaseClient,
  userId: string,
  mode: FeedMode = "friends",
): Promise<PostWithMeta[]> {
  const { loadBlockedIds, loadMutedIds } = await import("@/lib/safety");
  const { loadKeywordMutes, filterPostsByKeywords } = await import("@/lib/content-filters");

  const [blockedIds, mutedIds, keywordRows] = await Promise.all([
    loadBlockedIds(supabase, userId),
    loadMutedIds(supabase, userId),
    loadKeywordMutes(supabase, userId),
  ]);
  const keywords = keywordRows.map((k) => k.keyword);

  let ids: string[] = [userId];

  if (mode === "friends") {
    const { loadMutualFriends } = await import("@/lib/chat");
    const friends = await loadMutualFriends(supabase, userId);
    ids = [userId, ...friends.map((f) => f.id)];
  } else {
    const { data: following } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", userId);
    ids = [userId, ...(following?.map((f) => f.following_id) ?? [])];
  }

  if (ids.length === 0) return [];

  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .in("user_id", ids)
    .order("created_at", { ascending: false })
    .limit(50);

  const enriched = await enrichPosts(supabase, (posts as Post[]) ?? [], userId);
  const filtered = enriched.filter(
    (p) => !blockedIds.has(p.user_id) && !mutedIds.has(p.user_id),
  );
  return filterPostsByKeywords(filtered, keywords);
}

export async function loadUserPosts(
  supabase: SupabaseClient,
  profileUserId: string,
  currentUserId: string,
): Promise<PostWithMeta[]> {
  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .eq("user_id", profileUserId)
    .order("created_at", { ascending: false })
    .limit(50);

  return enrichPosts(supabase, (posts as Post[]) ?? [], currentUserId);
}

export async function loadComments(
  supabase: SupabaseClient,
  postId: string,
): Promise<Comment[]> {
  const { data } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  const comments = (data as Comment[]) ?? [];
  if (!comments.length) return [];

  const userIds = [...new Set(comments.map((c) => c.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", userIds);

  const map = new Map((profiles as Profile[])?.map((p) => [p.id, p]));
  const byId = new Map(comments.map((c) => [c.id, c]));

  return comments.map((c) => {
    const author = map.get(c.user_id);
    let reply_to = null;
    if (c.reply_to_id) {
      const parent = byId.get(c.reply_to_id);
      if (parent) {
        reply_to = {
          id: parent.id,
          content: parent.content,
          user_id: parent.user_id,
          author: map.get(parent.user_id),
        };
      }
    }
    return {
      ...c,
      reply_to_id: c.reply_to_id ?? null,
      author,
      reply_to,
    };
  });
}

export async function toggleLike(
  supabase: SupabaseClient,
  postId: string,
  userId: string,
  liked: boolean,
) {
  if (liked) {
    await supabase
      .from("post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);
  } else {
    await supabase.from("post_likes").insert({ post_id: postId, user_id: userId });
  }
}

export async function addComment(
  supabase: SupabaseClient,
  postId: string,
  userId: string,
  content: string,
  replyToId?: string | null,
) {
  return supabase
    .from("comments")
    .insert({
      post_id: postId,
      user_id: userId,
      content,
      ...(replyToId ? { reply_to_id: replyToId } : {}),
    })
    .select()
    .single();
}

export async function resharePost(
  supabase: SupabaseClient,
  originalPostId: string,
  userId: string,
  caption: string,
) {
  const { data: existing } = await supabase
    .from("post_reshares")
    .select("post_id")
    .eq("post_id", originalPostId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return { error: { message: "You already reshared this post." } };

  const { data: newPost, error: postError } = await supabase
    .from("posts")
    .insert({
      user_id: userId,
      content: caption,
      reshare_of: originalPostId,
    })
    .select()
    .single();

  if (postError || !newPost) return { error: postError };

  await supabase.from("post_reshares").insert({
    post_id: originalPostId,
    user_id: userId,
  });

  return { data: newPost };
}

export async function editPost(
  supabase: SupabaseClient,
  postId: string,
  userId: string,
  content: string,
  createdAt: string,
): Promise<{ error?: string }> {
  if (!canEditWithinWindow(createdAt)) {
    return { error: "You can only edit posts within 5 minutes of posting." };
  }

  const trimmed = content.trim();
  if (!trimmed) return { error: "Post cannot be empty." };

  const { error } = await supabase
    .from("posts")
    .update({ content: trimmed, edited_at: new Date().toISOString() })
    .eq("id", postId)
    .eq("user_id", userId);

  if (error) return { error: error.message };
  return {};
}

export function formatPostDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

export function formatBirthdate(date: string | null): string | null {
  if (!date) return null;
  return new Date(date + "T00:00:00").toLocaleDateString([], {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
