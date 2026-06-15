"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserPlus, UserMinus, MessageCircle, Gift } from "lucide-react";
import { GiftPickerModal } from "@/components/gifts/GiftPickerModal";
import { createClient } from "@/lib/supabase/client";
import { areMutualFriends, findOrCreateConversation } from "@/lib/chat";
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
  const [friends, setFriends] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [showGift, setShowGift] = useState(false);

  useEffect(() => {
    if (isOwn) return;
    areMutualFriends(createClient(), currentUser.id, profile.id).then(setFriends);
  }, [currentUser.id, profile.id, following, isOwn]);

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
    setMessageError(null);
    const supabase = createClient();
    const { convId, error } = await findOrCreateConversation(
      supabase,
      currentUser.id,
      profile.id,
    );
    if (error) {
      setMessageError(error);
      return;
    }
    if (convId) window.location.href = "/chat";
  }

  const birthdate = formatBirthdate(profile.date_of_birth);

  return (
    <div className="vintage-card overflow-hidden">
      <div className="relative h-28 bg-gradient-to-br from-vintage-rust via-vintage-rust-dark to-vintage-mustard sm:h-36">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.5)_0,transparent_40%),radial-gradient(circle_at_80%_60%,rgba(255,255,255,0.35)_0,transparent_45%)]" />
      </div>
      <div className="px-5 pb-6 sm:px-6">
        <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
          <div className="rounded-full ring-4 ring-vintage-paper">
            <Avatar
              name={profile.display_name}
              avatarUrl={profile.avatar_url}
              size="xl"
            />
          </div>
          <div className="flex flex-wrap gap-2 sm:pb-1">
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
                  disabled={!friends}
                  title={
                    friends
                      ? "Send a message"
                      : "Both of you must connect (follow each other) to message"
                  }
                  className="vintage-btn-outline flex items-center gap-2 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <MessageCircle className="h-4 w-4" /> Message
                </button>
                <button
                  onClick={() => setShowGift(true)}
                  disabled={!friends}
                  title={friends ? "Send a gift" : "Connect first to send gifts"}
                  className="vintage-btn-outline flex items-center gap-2 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Gift className="h-4 w-4" /> Gift
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-4">
          <h1 className="font-display text-2xl font-bold tracking-tight text-vintage-ink">
            {profile.display_name}
          </h1>
          <p className="text-sm font-medium text-vintage-rust">@{profile.username}</p>

          {(profile.country || birthdate) && (
            <p className="mt-2 text-sm text-vintage-ink-muted">
              {[profile.country, birthdate ? `Born ${birthdate}` : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}

          {profile.bio && (
            <p className="mt-3 text-sm leading-relaxed text-vintage-ink whitespace-pre-wrap">
              {profile.bio}
            </p>
          )}

          <div className="mt-4 flex gap-3">
            <div className="vintage-card-inset px-4 py-2">
              <span className="font-display text-lg font-bold text-vintage-ink">
                {counts.followers}
              </span>{" "}
              <span className="text-sm text-vintage-ink-muted">Followers</span>
            </div>
            <div className="vintage-card-inset px-4 py-2">
              <span className="font-display text-lg font-bold text-vintage-ink">
                {counts.following}
              </span>{" "}
              <span className="text-sm text-vintage-ink-muted">Following</span>
            </div>
          </div>

          {messageError ? (
            <p className="mt-3 text-sm text-vintage-rust">{messageError}</p>
          ) : !isOwn && !friends ? (
            <p className="mt-3 text-xs text-vintage-ink-muted">
              Connect with each other (mutual follow) to unlock messaging.
            </p>
          ) : null}
        </div>
      </div>

      {showGift && !isOwn && (
        <GiftPickerModal
          recipient={profile}
          context="profile"
          onClose={() => setShowGift(false)}
        />
      )}
    </div>
  );
}
