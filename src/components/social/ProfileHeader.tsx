"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserPlus, UserMinus, MessageCircle, Gift, Briefcase, ImageIcon } from "lucide-react";
import { GiftPickerModal } from "@/components/gifts/GiftPickerModal";
import { createClient } from "@/lib/supabase/client";
import { UserSafetyMenu } from "@/components/safety/UserSafetyMenu";
import { areMutualFriends, canMessageUser, findOrCreateConversation } from "@/lib/chat";
import { acceptsBusinessContact, hasBusinessProfile } from "@/lib/business";
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
  const [canMessage, setCanMessage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [showGift, setShowGift] = useState(false);

  useEffect(() => {
    if (isOwn) return;
    const supabase = createClient();
    areMutualFriends(supabase, currentUser.id, profile.id).then(setFriends);
    canMessageUser(supabase, currentUser.id, profile.id).then((r) =>
      setCanMessage(r.allowed),
    );
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
  const isBusinessAccount = profile.account_kind === "business";
  const showBusiness = hasBusinessProfile(profile);
  const showCover = showBusiness && !!profile.business_cover_url;
  const coverStyle =
    showCover
      ? {
          backgroundImage: `linear-gradient(rgba(0,0,0,0.25), rgba(0,0,0,0.25)), url(${profile.business_cover_url})`,
          backgroundSize: "cover" as const,
          backgroundPosition: "center" as const,
        }
      : undefined;

  return (
    <div className="vintage-card overflow-hidden">
      <div className="relative">
        <div
          className={`relative z-0 h-28 sm:h-36 ${
            showCover ? "" : "bg-gradient-to-br from-vintage-rust via-vintage-rust-dark to-vintage-mustard"
          }`}
          style={coverStyle}
        >
          {!showCover && (
            <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.5)_0,transparent_40%),radial-gradient(circle_at_80%_60%,rgba(255,255,255,0.35)_0,transparent_45%)]" />
          )}
          {isOwn && showBusiness && (
            <Link
              href="/profile/business/edit"
              className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 rounded-lg bg-black/50 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-black/65"
            >
              <ImageIcon className="h-3.5 w-3.5" />
              {profile.business_cover_url ? "Change banner" : "Add banner"}
            </Link>
          )}
        </div>

        <div className="relative z-10 px-5 pb-6 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="-mt-12 sm:-mt-14">
              <div className="inline-flex rounded-full bg-vintage-paper p-1 ring-4 ring-vintage-paper">
                <Avatar
                  name={profile.display_name}
                  avatarUrl={profile.avatar_url}
                  size="xl"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:pb-1">
              {isOwn ? (
                <>
                  <Link href="/profile/edit" className="vintage-btn px-4 py-2 text-sm">
                    Edit profile
                  </Link>
                  {showBusiness ? (
                    <Link
                      href="/profile/business/edit"
                      className="vintage-btn-outline flex items-center gap-2 px-4 py-2 text-sm"
                    >
                      <Briefcase className="h-4 w-4" /> Business
                    </Link>
                  ) : (
                    <Link
                      href="/profile/business/setup"
                      className="vintage-btn-outline flex items-center gap-2 px-4 py-2 text-sm"
                    >
                      <Briefcase className="h-4 w-4" /> Add business
                    </Link>
                  )}
                </>
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
                    disabled={!canMessage}
                    title={
                      canMessage
                        ? "Send a message"
                        : "Connect with each other, or message this business from their showcase"
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
                  <UserSafetyMenu profile={profile} currentUserId={currentUser.id} />
                </>
              )}
            </div>
          </div>

          <div className="mt-4">
            <h1 className="font-display text-2xl font-bold tracking-tight text-vintage-ink">
              {isBusinessAccount && profile.business_name
                ? profile.business_name
                : profile.display_name}
            </h1>
            <p className="text-sm font-medium text-vintage-rust">
              @{profile.username}
              {isBusinessAccount && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-vintage-rust/15 px-2 py-0.5 text-[10px] font-semibold uppercase">
                  <Briefcase className="h-3 w-3" /> Business
                </span>
              )}
            </p>
            {isBusinessAccount && profile.display_name && (
              <p className="mt-1 text-sm text-vintage-ink-muted">
                Contact: {profile.display_name}
              </p>
            )}

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
            ) : !isOwn && !canMessage ? (
              <p className="mt-3 text-xs text-vintage-ink-muted">
                Connect with each other (mutual follow) to unlock messaging.
              </p>
            ) : !isOwn && acceptsBusinessContact(profile) && !friends ? (
              <p className="mt-3 text-xs text-vintage-ink-muted">
                You can message this business without connecting first.
              </p>
            ) : null}
          </div>
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
