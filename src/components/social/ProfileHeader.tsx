"use client";

import { useState } from "react";
import Link from "next/link";
import { UserPlus, UserMinus, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { findOrCreateConversation } from "@/lib/chat";
import { formatBirthdate, getFollowCounts, isFollowing, toggleFollow } from "@/lib/social";
import type { FollowCounts, Profile } from "@/lib/types";
import { Avatar } from "@/components/Avatar";

export function ProfileHeader({
  profile,
  currentUser,
  initialCounts,
  initialFollowing,
}: {
  profile: Profile;
  currentUser: Profile;
  initialCounts: FollowCounts;
  initialFollowing: boolean;
}) {
  const isOwn = profile.id === currentUser.id;
  const [counts, setCounts] = useState(initialCounts);
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  async function handleFollow() {
    setLoading(true);
    const supabase = createClient();
    const nowFollowing = await toggleFollow(supabase, currentUser.id, profile.id);
    setFollowing(nowFollowing);
    const fresh = await getFollowCounts(supabase, profile.id);
    setCounts(fresh);
    setLoading(false);
  }

  async function handleMessage() {
    const supabase = createClient();
    const convId = await findOrCreateConversation(
      supabase,
      currentUser.id,
      profile.id,
    );
    if (convId) window.location.href = "/chat";
  }

  const birthdate = formatBirthdate(profile.date_of_birth);

  return (
    <div className="vintage-card p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Avatar
          name={profile.display_name}
          avatarUrl={profile.avatar_url}
          size="xl"
        />
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl font-bold text-vintage-ink">
            {profile.display_name}
          </h1>
          <p className="text-vintage-rust">@{profile.username}</p>
          {profile.country && (
            <p className="mt-1 text-sm text-vintage-ink-muted">{profile.country}</p>
          )}
          {birthdate && (
            <p className="mt-1 text-sm text-vintage-ink-muted">Born {birthdate}</p>
          )}
          {profile.bio && (
            <p className="mt-3 text-sm leading-relaxed text-vintage-ink whitespace-pre-wrap">
              {profile.bio}
            </p>
          )}

          <div className="mt-4 flex gap-6 text-sm">
            <span>
              <strong className="text-vintage-ink">{counts.followers}</strong>{" "}
              <span className="text-vintage-ink-muted">Followers</span>
            </span>
            <span>
              <strong className="text-vintage-ink">{counts.following}</strong>{" "}
              <span className="text-vintage-ink-muted">Following</span>
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {isOwn ? (
              <Link href="/profile/edit" className="vintage-btn px-4 py-2 text-sm">
                Edit profile
              </Link>
            ) : (
              <>
                <button
                  onClick={handleFollow}
                  disabled={loading}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
                    following ? "vintage-btn-outline" : "vintage-btn"
                  }`}
                >
                  {following ? (
                    <>
                      <UserMinus className="h-4 w-4" /> Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" /> Connect
                    </>
                  )}
                </button>
                <button
                  onClick={handleMessage}
                  className="vintage-btn-outline flex items-center gap-2 px-4 py-2 text-sm"
                >
                  <MessageCircle className="h-4 w-4" /> Message
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
