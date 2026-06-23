"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, Compass, Newspaper, Star, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getActiveMode } from "@/lib/business";
import { loadFeed, type FeedMode } from "@/lib/social";
import type { PostWithMeta, Profile } from "@/lib/types";
import { CreatePost } from "@/components/social/CreatePost";
import { PostCard } from "@/components/social/PostCard";
import { PostCardSkeleton } from "@/components/skeletons/PostCardSkeleton";
import { VibePromptBanner } from "@/components/social/VibePromptBanner";

export function FeedView({ currentUser }: { currentUser: Profile }) {
  const [posts, setPosts] = useState<PostWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<FeedMode>("friends");
  const inBusinessMode = getActiveMode(currentUser) === "business";

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await loadFeed(createClient(), currentUser.id, mode);
    setPosts(data);
    setLoading(false);
  }, [currentUser.id, mode]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-vintage-rust/10 text-vintage-rust md:h-11 md:w-11">
            <Newspaper className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold tracking-tight text-vintage-ink md:text-2xl">
              Personal feed
            </h1>
            <p className="text-sm text-vintage-ink-muted">
              {mode === "friends"
                ? "Friends only — personal posts, not business listings"
                : mode === "close_friends"
                  ? "Close friends only — your inner circle"
                  : "People you follow — personal posts only"}
            </p>
          </div>
        </div>
        <div className="flex gap-1 vintage-card-inset p-1">
          <button
            type="button"
            onClick={() => setMode("friends")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              mode === "friends"
                ? "bg-vintage-rust text-[#fff8f0]"
                : "text-vintage-ink-muted hover:text-vintage-ink"
            }`}
          >
            <Users className="h-3.5 w-3.5" /> Friends
          </button>
          <button
            type="button"
            onClick={() => setMode("close_friends")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              mode === "close_friends"
                ? "bg-vintage-rust text-[#fff8f0]"
                : "text-vintage-ink-muted hover:text-vintage-ink"
            }`}
          >
            <Star className="h-3.5 w-3.5" /> Close
          </button>
          <button
            type="button"
            onClick={() => setMode("following")}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
              mode === "following"
                ? "bg-vintage-rust text-[#fff8f0]"
                : "text-vintage-ink-muted hover:text-vintage-ink"
            }`}
          >
            Following
          </button>
        </div>
      </div>

      {inBusinessMode ? (
        <div className="vintage-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-vintage-ink">You are in business mode</p>
            <p className="text-xs text-vintage-ink-muted">
              Personal feed is for friends. Post products and offers on your storefront.
            </p>
          </div>
          <Link
            href={`/business/${currentUser.username}`}
            className="vintage-btn inline-flex items-center gap-2 px-4 py-2 text-sm"
          >
            <Briefcase className="h-4 w-4" /> My storefront
          </Link>
        </div>
      ) : (
        <>
          <VibePromptBanner currentUser={currentUser} />
          <CreatePost user={currentUser} onPosted={refresh} postContext="personal" />
        </>
      )}

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
            {mode === "close_friends"
              ? "No close friend posts yet"
              : mode === "friends"
                ? "No friend posts yet"
                : "Your feed is quiet"}
          </p>
          <p className="mt-1 max-w-sm text-sm text-vintage-ink-muted">
            {mode === "close_friends"
              ? "Mark mutual friends as close friends on their profile to see them here."
              : mode === "friends"
                ? "Connect with people (mutual follow) to see their posts here chronologically."
                : "Share your first post above, or follow people to see their updates here."}
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
