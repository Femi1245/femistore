"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { markPostViewed } from "@/lib/post-analytics";
import { loadPostById } from "@/lib/social";
import type { PostWithMeta, Profile } from "@/lib/types";
import { BackButton } from "@/components/layout/BackButton";
import { PostAnalyticsPanel } from "@/components/social/PostAnalyticsPanel";
import { PostCard } from "@/components/social/PostCard";
import { PostCardSkeleton } from "@/components/skeletons/PostCardSkeleton";

export function PostDetailView({
  postId,
  currentUser,
}: {
  postId: string;
  currentUser: Profile;
}) {
  const searchParams = useSearchParams();
  const openComments = searchParams.get("comments") === "1";
  const focusAnalytics = searchParams.get("analytics") === "1";
  const [post, setPost] = useState<PostWithMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await loadPostById(createClient(), postId, currentUser.id);
    setPost(data);
    setMissing(!data);
    setLoading(false);
  }, [postId, currentUser.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!post || post.user_id === currentUser.id) return;
    void markPostViewed(createClient(), post.id, currentUser.id, post.user_id);
  }, [post, currentUser.id]);

  useEffect(() => {
    if (!focusAnalytics || !post || post.user_id !== currentUser.id) return;
    const el = document.getElementById("post-analytics");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focusAnalytics, post, currentUser.id]);

  const isOwn = post?.user_id === currentUser.id;

  return (
    <div className="space-y-5 md:space-y-8">
      <header className="editorial-masthead">
        <BackButton fallbackHref="/notifications" label="Back" />
        <p className="editorial-eyebrow">Post</p>
        <h1 className="editorial-title">
          {focusAnalytics && isOwn ? "Analytics" : "Conversation"}
        </h1>
      </header>

      {loading ? (
        <PostCardSkeleton />
      ) : missing || !post ? (
        <div className="vintage-card flex flex-col items-center px-6 py-14 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-vintage-rust/10 text-vintage-rust">
            <FileText className="h-7 w-7" />
          </div>
          <p className="font-display text-lg font-bold text-vintage-ink">
            Post not found
          </p>
          <p className="mt-1 max-w-sm text-sm text-vintage-ink-muted">
            It may have been deleted, or you no longer have access.
          </p>
          <BackButton
            fallbackHref="/notifications"
            label="Back to notifications"
            className="vintage-btn mt-5 inline-flex items-center gap-1.5 px-4 py-2 text-sm"
          />
        </div>
      ) : (
        <div className="space-y-4">
          {isOwn && (
            <div id="post-analytics">
              <PostAnalyticsPanel postId={post.id} ownerId={currentUser.id} />
            </div>
          )}
          <div className="divide-y divide-vintage-border">
            <PostCard
              post={post}
              currentUser={currentUser}
              onUpdate={refresh}
              initialShowComments={openComments}
            />
          </div>
        </div>
      )}
    </div>
  );
}
