"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { loadUserPosts } from "@/lib/social";
import type { PostWithMeta, Profile } from "@/lib/types";
import { CreatePost } from "@/components/social/CreatePost";
import { PostCard } from "@/components/social/PostCard";
import { PostCardSkeleton } from "@/components/skeletons/PostCardSkeleton";

export function ProfilePosts({
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
    );
    setPosts(data);
    setLoading(false);
  }, [profileUserId, currentUser.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="space-y-4">
      {isOwn && <CreatePost user={currentUser} onPosted={refresh} />}

      {loading ? (
        <>
          <PostCardSkeleton />
          <PostCardSkeleton />
        </>
      ) : posts.length === 0 ? (
        <p className="vintage-card py-8 text-center text-vintage-ink-muted">
          {isOwn ? "You haven't posted yet." : "No posts yet."}
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
