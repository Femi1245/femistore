"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { loadBusinessMarketplacePosts } from "@/lib/social";
import type { PostWithMeta, Profile } from "@/lib/types";
import { PostCard } from "@/components/social/PostCard";
import { PostCardSkeleton } from "@/components/skeletons/PostCardSkeleton";

export function BusinessMarketplaceFeed({
  currentUser,
  title = "Marketplace",
  description = "Latest products, offers, and listings from businesses.",
}: {
  currentUser: Profile;
  title?: string;
  description?: string;
}) {
  const [posts, setPosts] = useState<PostWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await loadBusinessMarketplacePosts(createClient(), currentUser.id);
    setPosts(data);
    setLoading(false);
  }, [currentUser.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vintage-ink-muted">
          Buy & sell
        </p>
        <h2 className="font-display text-xl font-semibold text-vintage-ink">{title}</h2>
        <p className="mt-1 text-sm text-vintage-ink-muted">{description}</p>
      </div>

      {loading ? (
        <>
          <PostCardSkeleton />
          <PostCardSkeleton />
        </>
      ) : posts.length === 0 ? (
        <p className="vintage-card py-10 text-center text-sm text-vintage-ink-muted">
          No business listings yet. Businesses can post products and offers on their storefront.
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
    </section>
  );
}
