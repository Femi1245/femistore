"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { loadFeed } from "@/lib/social";
import type { PostWithMeta, Profile } from "@/lib/types";
import { CreatePost } from "@/components/social/CreatePost";
import { PostCard } from "@/components/social/PostCard";
import { PostCardSkeleton } from "@/components/skeletons/PostCardSkeleton";

export function FeedView({ currentUser }: { currentUser: Profile }) {
  const [posts, setPosts] = useState<PostWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await loadFeed(createClient(), currentUser.id);
    setPosts(data);
    setLoading(false);
  }, [currentUser.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-vintage-ink">Feed</h1>
        <p className="text-sm text-vintage-ink-muted">
          Posts from people you follow and your own updates
        </p>
      </div>

      <CreatePost user={currentUser} onPosted={refresh} />

      {loading ? (
        <div className="space-y-4">
          <PostCardSkeleton />
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      ) : posts.length === 0 ? (
        <div className="vintage-card py-12 text-center">
          <p className="text-vintage-ink-muted">No posts yet.</p>
          <p className="mt-1 text-sm text-vintage-ink-muted/80">
            Follow people from Discover or post something to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              onUpdate={refresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}
