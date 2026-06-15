"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Compass, Newspaper } from "lucide-react";
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
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-vintage-rust/10 text-vintage-rust">
          <Newspaper className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-vintage-ink">
            Your Feed
          </h1>
          <p className="text-sm text-vintage-ink-muted">
            Updates from people you follow
          </p>
        </div>
      </div>

      <CreatePost user={currentUser} onPosted={refresh} />

      {loading ? (
        <div className="space-y-4">
          <PostCardSkeleton />
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      ) : posts.length === 0 ? (
        <div className="vintage-card flex flex-col items-center px-6 py-14 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-vintage-rust/10 text-vintage-rust">
            <Newspaper className="h-7 w-7" />
          </div>
          <p className="font-display text-lg font-bold text-vintage-ink">
            Your feed is quiet
          </p>
          <p className="mt-1 max-w-sm text-sm text-vintage-ink-muted">
            Share your first post above, or follow people to see their updates here.
          </p>
          <Link
            href="/chat"
            className="vintage-btn-outline mt-5 flex items-center gap-2 px-5 py-2.5 text-sm"
          >
            <Compass className="h-4 w-4" /> Discover people
          </Link>
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
