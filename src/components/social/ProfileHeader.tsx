"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserPlus, UserMinus, MessageCircle, Gift, Briefcase, ImageIcon } from "lucide-react";
import { GiftPickerModal } from "@/components/gifts/GiftPickerModal";
import { createClient } from "@/lib/supabase/client";
import { CloseFriendButton } from "@/components/social/CloseFriendButton";
import { UserSafetyMenu } from "@/components/safety/UserSafetyMenu";
import { areMutualFriends, canMessageUser, findOrCreateConversation } from "@/lib/chat";
import {
  acceptConnectionRequest,
  declineConnectionRequest,
  getConnectionStatus,
  getIncomingConnectionRequest,
  sendConnectionRequest,
  type ConnectionStatus,
} from "@/lib/connection-requests";
import { acceptsBusinessContact, getBusinessProfileUrl, hasBusinessProfile, isBusinessPrimaryAccount } from "@/lib/business";
import { formatBirthdate, getFollowCounts, isFollowing, toggleFollow } from "@/lib/social";
import { isBirthdayToday } from "@/lib/birthday";
import type { FollowCounts, Profile } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { VerifiedName } from "@/components/VerifiedBadge";

export function ProfileHeader({
  profile,
  currentUser,
  initialCounts,
  initialFollowing,
  variant = "personal",
}: {
  profile: Profile;
  currentUser: Profile;
  initialCounts: FollowCounts;
  initialFollowing: boolean;
  variant?: "personal" | "business";
}) {
  const isOwn = profile.id === currentUser.id;
  const [counts, setCounts] = useState(initialCounts);
  const [following, setFollowing] = useState(initialFollowing);
  const [friends, setFriends] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("none");
  const [incomingRequestId, setIncomingRequestId] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [canMessage, setCanMessage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [showGift, setShowGift] = useState(false);

  useEffect(() => {
    if (isOwn) return;
    const supabase = createClient();
    areMutualFriends(supabase, currentUser.id, profile.id).then((mutual) => {
      setFriends(mutual);
      if (mutual) setConnectionStatus("friends");
    });
    getConnectionStatus(supabase, currentUser.id, profile.id).then(setConnectionStatus);
    getIncomingConnectionRequest(supabase, currentUser.id, profile.id).then((req) =>
      setIncomingRequestId(req?.id ?? null),
    );
    canMessageUser(supabase, currentUser.id, profile.id).then((r) =>
      setCanMessage(r.allowed),
    );
  }, [currentUser.id, profile.id, isOwn]);

  async function refreshConnectionState() {
    const supabase = createClient();
    const mutual = await areMutualFriends(supabase, currentUser.id, profile.id);
    setFriends(mutual);
    setConnectionStatus(
      mutual ? "friends" : await getConnectionStatus(supabase, currentUser.id, profile.id),
    );
    const req = await getIncomingConnectionRequest(supabase, currentUser.id, profile.id);
    setIncomingRequestId(req?.id ?? null);
    const msg = await canMessageUser(supabase, currentUser.id, profile.id);
    setCanMessage(msg.allowed);
    const fresh = await getFollowCounts(supabase, profile.id);
    setCounts(fresh);
    setFollowing(await isFollowing(supabase, currentUser.id, profile.id));
  }

  async function handleConnect() {
    setConnectError(null);
    setLoading(true);
    const supabase = createClient();

    if (connectionStatus === "friends") {
      await toggleFollow(supabase, currentUser.id, profile.id);
      await refreshConnectionState();
      setLoading(false);
      return;
    }

    const { error } = await sendConnectionRequest(supabase, currentUser.id, profile.id);
    if (error) {
      setConnectError(error);
      setLoading(false);
      return;
    }

    setConnectionStatus("outgoing_pending");
    setLoading(false);
  }

  async function handleAcceptConnection() {
    if (!incomingRequestId) return;
    setConnectError(null);
    setLoading(true);
    const { error } = await acceptConnectionRequest(createClient(), incomingRequestId);
    if (error) {
      setConnectError(error);
      setLoading(false);
      return;
    }
    await refreshConnectionState();
    setLoading(false);
  }

  async function handleDeclineConnection() {
    if (!incomingRequestId) return;
    setLoading(true);
    await declineConnectionRequest(createClient(), incomingRequestId, currentUser.id);
    setIncomingRequestId(null);
    setConnectionStatus("none");
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
  const birthdayToday = isBirthdayToday(profile.date_of_birth);
  const showBusiness = hasBusinessProfile(profile);
  const personalView = variant === "personal";
  const showCover = !personalView && showBusiness && !!profile.business_cover_url;
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
          className={`relative z-0 h-32 sm:h-44 ${showCover ? "" : "profile-cover-editorial"}`}
          style={coverStyle}
        >
          {isOwn && showBusiness && !personalView && (
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
                      href={getBusinessProfileUrl(profile.username)}
                      className="vintage-btn-outline flex items-center gap-2 px-4 py-2 text-sm"
                    >
                      <Briefcase className="h-4 w-4" /> Business page
                    </Link>
                  ) : !isBusinessPrimaryAccount(profile) ? (
                    <Link
                      href="/profile/business/setup"
                      className="vintage-btn-outline flex items-center gap-2 px-4 py-2 text-sm"
                    >
                      <Briefcase className="h-4 w-4" /> Add business
                    </Link>
                  ) : null}
                </>
              ) : (
                <>
                  {connectionStatus === "incoming_pending" && incomingRequestId ? (
                    <>
                      <button
                        type="button"
                        onClick={handleAcceptConnection}
                        disabled={loading}
                        className="vintage-btn flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50"
                      >
                        <UserPlus className="h-4 w-4" /> Accept
                      </button>
                      <button
                        type="button"
                        onClick={handleDeclineConnection}
                        disabled={loading}
                        className="vintage-btn-outline flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleConnect}
                      disabled={loading || connectionStatus === "outgoing_pending"}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
                        connectionStatus === "friends"
                          ? "vintage-btn-outline"
                          : connectionStatus === "outgoing_pending"
                            ? "vintage-btn-outline"
                            : "vintage-btn"
                      }`}
                    >
                      {connectionStatus === "friends" ? (
                        <>
                          <UserMinus className="h-4 w-4" /> Connected
                        </>
                      ) : connectionStatus === "outgoing_pending" ? (
                        <>Request sent</>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4" /> Connect
                        </>
                      )}
                    </button>
                  )}
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
                  <CloseFriendButton
                    currentUserId={currentUser.id}
                    profileId={profile.id}
                  />
                  <UserSafetyMenu profile={profile} currentUserId={currentUser.id} />
                </>
              )}
            </div>
          </div>

          <div className="mt-4">
            <h1 className="font-display text-2xl font-bold tracking-tight text-vintage-ink">
              <VerifiedName
                name={profile.display_name}
                verified={profile.is_verified}
                category={profile.verified_category}
              />
            </h1>
            <p className="text-sm font-medium text-vintage-rust">
              @{profile.username}
              {showBusiness && personalView && !isBusinessPrimaryAccount(profile) && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-sm bg-vintage-rust/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-vintage-rust">
                  <Briefcase className="h-3 w-3" /> Has business
                </span>
              )}
            </p>

            {(profile.country || birthdate) && (
              <p className="mt-2 text-sm text-vintage-ink-muted">
                {[profile.country, birthdate ? `Born ${birthdate}` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}

            {birthdayToday && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-vintage-rust/15 px-3 py-1 text-sm font-semibold text-vintage-rust">
                🎂 Birthday today!
              </p>
            )}

            {isOwn && !profile.date_of_birth && (
              <Link
                href="/profile/birthday"
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-vintage-mustard/20 px-3 py-2 text-sm font-medium text-vintage-ink hover:bg-vintage-mustard/30"
              >
                🎂 Add your birthday
              </Link>
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
            ) : connectError ? (
              <p className="mt-3 text-sm text-vintage-rust">{connectError}</p>
            ) : !isOwn && connectionStatus === "incoming_pending" ? (
              <p className="mt-3 text-xs text-vintage-ink-muted">
                Accept to become friends and unlock messaging.
              </p>
            ) : !isOwn && connectionStatus === "outgoing_pending" ? (
              <p className="mt-3 text-xs text-vintage-ink-muted">
                Waiting for them to accept your connection request.
              </p>
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
