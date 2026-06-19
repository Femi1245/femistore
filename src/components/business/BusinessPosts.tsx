"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { loadUserPosts } from "@/lib/social";
import type { PostWithMeta, Profile } from "@/lib/types";
import { CreatePost } from "@/components/social/CreatePost";
import { PostCard } from "@/components/social/PostCard";
import { PostCardSkeleton } from "@/components/skeletons/PostCardSkeleton";

export function BusinessPosts({
  profileUserId,
  currentUser,
}: {
  profileUserId: string;
  currentUser: Profile;
}) {
  const [posts, setPosts] = useState<PostWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const isOwn = profileUserId === currentUser.id;

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await loadUserPosts(
      createClient(),
      profileUserId,
      currentUser.id,
      "business",
    );
    setPosts(data);
    setLoading(false);
  }, [profileUserId, currentUser.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="space-y-4">
      {isOwn && (
        <CreatePost
          user={currentUser}
          onPosted={refresh}
          postContext="business"
        />
      )}

      {loading ? (
        <>
          <PostCardSkeleton />
          <PostCardSkeleton />
        </>
      ) : posts.length === 0 ? (
        <p className="vintage-card py-10 text-center text-vintage-ink-muted">
          {isOwn
            ? "No business posts yet. Share your first product, offer, or update above."
            : "This business hasn't posted yet."}
        </p>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentUser={currentUser}
            onUpdate={refresh}
          />
        ))
      )}
    </div>
  );
}
