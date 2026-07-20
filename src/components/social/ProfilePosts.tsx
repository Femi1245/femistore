"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PenLine } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { loadUserPosts } from "@/lib/social";
import type { PostWithMeta, Profile } from "@/lib/types";
import { CreatePost } from "@/components/social/CreatePost";
import { PostCard } from "@/components/social/PostCard";
import { PostCardSkeleton } from "@/components/skeletons/PostCardSkeleton";

export function ProfilePosts({
  profileUserId,
  currentUser,
  initialPosts,
}: {
  profileUserId: string;
  currentUser: Profile;
  initialPosts?: PostWithMeta[];
}) {
  const [posts, setPosts] = useState<PostWithMeta[]>(initialPosts ?? []);
  const [loading, setLoading] = useState(initialPosts === undefined);
  const isOwn = profileUserId === currentUser.id;
  const usedInitial = useRef(initialPosts !== undefined);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await loadUserPosts(
      createClient(),
      profileUserId,
      currentUser.id,
      "personal",
    );
    setPosts(data);
    setLoading(false);
  }, [profileUserId, currentUser.id]);

  useEffect(() => {
    if (usedInitial.current && initialPosts) {
      usedInitial.current = false;
      setPosts(initialPosts);
      setLoading(false);
      return;
    }
    void refresh();
  }, [refresh, initialPosts]);

  function focusComposer() {
    const el = document.getElementById("profile-create-post");
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const textarea = el?.querySelector("textarea");
    textarea?.focus();
  }

  return (
    <div className="space-y-4">
      {isOwn && (
        <div id="profile-create-post">
          <CreatePost user={currentUser} onPosted={refresh} postContext="personal" />
        </div>
      )}

      {loading ? (
        <>
          <PostCardSkeleton />
          <PostCardSkeleton />
        </>
      ) : posts.length === 0 ? (
        <div className="vintage-card flex flex-col items-center gap-3 px-6 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-vintage-rust/10 text-vintage-rust">
            <PenLine className="h-6 w-6" />
          </div>
          <p className="font-display text-lg font-bold text-vintage-ink">
            {isOwn ? "Share your first post" : "No posts yet"}
          </p>
          <p className="max-w-sm text-sm text-vintage-ink-muted">
            {isOwn
              ? "Write something above — then tap Analytics on your post to see who viewed it."
              : "This person hasn't posted anything yet."}
          </p>
          {isOwn && (
            <button
              type="button"
              onClick={focusComposer}
              className="vintage-btn mt-1 px-4 py-2 text-sm"
            >
              Write a post
            </button>
          )}
        </div>
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
