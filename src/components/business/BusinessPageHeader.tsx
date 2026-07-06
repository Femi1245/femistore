"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Gift,
  Globe,
  ImageIcon,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  User,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { GiftPickerModal } from "@/components/gifts/GiftPickerModal";
import { BusinessContactButton } from "@/components/business/BusinessContactButton";
import { createClient } from "@/lib/supabase/client";
import { UserSafetyMenu } from "@/components/safety/UserSafetyMenu";
import {
  areMutualFriends,
  canMessageUser,
  findOrCreateConversation,
} from "@/lib/chat";
import {
  acceptsBusinessContact,
  getPersonalProfileUrl,
  isBusinessPrimaryAccount,
} from "@/lib/business";
import { getFollowCounts, toggleFollow } from "@/lib/social";
import type { FollowCounts, Profile } from "@/lib/types";
import { Avatar } from "@/components/Avatar";

export function BusinessPageHeader({
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

  const name = profile.business_name ?? profile.display_name;
  const showCover = !!profile.business_cover_url;
  const coverStyle = showCover
    ? {
        backgroundImage: `linear-gradient(rgba(26,26,26,0.35), rgba(26,26,26,0.5)), url(${profile.business_cover_url})`,
        backgroundSize: "cover" as const,
        backgroundPosition: "center" as const,
      }
    : undefined;

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

  return (
    <div className="vintage-card overflow-hidden">
      <div className="relative">
        <div
          className={`relative z-0 h-36 sm:h-44 ${
            showCover
              ? ""
              : "bg-gradient-to-br from-vintage-ink via-[#2a2a2a] to-vintage-rust/80"
          }`}
          style={coverStyle}
        >
          {!showCover && (
            <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(45deg,rgba(201,169,98,0.3)_25%,transparent_25%,transparent_75%,rgba(201,169,98,0.3)_75%)] [background-size:24px_24px]" />
          )}
          {isOwn && (
            <Link
              href="/profile/business/edit"
              className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 rounded-sm bg-black/55 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-sm transition hover:bg-black/70"
            >
              <ImageIcon className="h-3.5 w-3.5" />
              {profile.business_cover_url ? "Banner" : "Add banner"}
            </Link>
          )}
        </div>

        <div className="relative z-10 px-5 pb-6 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="-mt-12 sm:-mt-14">
              <div className="inline-flex rounded-sm bg-vintage-paper p-1 ring-2 ring-vintage-rust/30">
                <Avatar name={name} avatarUrl={profile.avatar_url} size="xl" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:pb-1">
              {isOwn ? (
                <>
                  <Link href="/profile/business/edit" className="vintage-btn px-4 py-2 text-sm">
                    Edit storefront
                  </Link>
                  {!isBusinessPrimaryAccount(profile) && (
                    <Link
                      href={getPersonalProfileUrl(profile.username)}
                      className="vintage-btn-outline inline-flex items-center gap-2 px-4 py-2 text-sm"
                    >
                      <User className="h-4 w-4" /> Personal
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
                        <UserPlus className="h-4 w-4" /> Follow
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleMessage}
                    disabled={!canMessage}
                    className="vintage-btn-outline flex items-center gap-2 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <MessageCircle className="h-4 w-4" /> Contact
                  </button>
                  <button
                    onClick={() => setShowGift(true)}
                    disabled={!friends}
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
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-sm bg-vintage-rust/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-vintage-rust">
                <Briefcase className="h-3 w-3" /> Business
              </span>
              {profile.business_category && (
                <span className="rounded-sm border border-vintage-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-vintage-ink-muted">
                  {profile.business_category}
                </span>
              )}
            </div>

            <h1 className="font-display text-3xl font-semibold tracking-tight text-vintage-ink">
              {name}
            </h1>
            {profile.business_tagline && (
              <p className="mt-1 text-sm font-medium text-vintage-rust">
                {profile.business_tagline}
              </p>
            )}
            <p className="mt-1 text-sm text-vintage-ink-muted">@{profile.username}</p>

            {profile.business_description && (
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-vintage-ink whitespace-pre-wrap">
                {profile.business_description}
              </p>
            )}

            {profile.business_services && (
              <div className="mt-4 max-w-2xl border border-vintage-border p-4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-vintage-ink-muted">
                  What we offer
                </p>
                <p className="whitespace-pre-wrap text-sm text-vintage-ink">
                  {profile.business_services}
                </p>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-4 text-sm text-vintage-ink-muted">
              {profile.business_location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-vintage-rust" />
                  {profile.business_location}
                </span>
              )}
              {profile.business_email && (
                <a
                  href={`mailto:${profile.business_email}`}
                  className="inline-flex items-center gap-1.5 hover:text-vintage-rust"
                >
                  <Mail className="h-4 w-4" />
                  {profile.business_email}
                </a>
              )}
              {profile.business_phone && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-4 w-4" />
                  {profile.business_phone}
                </span>
              )}
              {profile.business_website && (
                <a
                  href={
                    profile.business_website.startsWith("http")
                      ? profile.business_website
                      : `https://${profile.business_website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-vintage-rust"
                >
                  <Globe className="h-4 w-4" />
                  Website
                </a>
              )}
            </div>

            <div className="mt-4 flex gap-3">
              <div className="border border-vintage-border px-4 py-2">
                <span className="font-display text-lg font-bold text-vintage-ink">
                  {counts.followers}
                </span>{" "}
                <span className="text-sm text-vintage-ink-muted">Followers</span>
              </div>
            </div>

            {!isOwn && currentUser.id && (
              <div className="mt-4">
                <BusinessContactButton business={profile} currentUserId={currentUser.id} />
              </div>
            )}

            {messageError ? (
              <p className="mt-3 text-sm text-vintage-rust">{messageError}</p>
            ) : !isOwn && acceptsBusinessContact(profile) && !friends ? (
              <p className="mt-3 text-xs text-vintage-ink-muted">
                You can contact this business without connecting first.
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
