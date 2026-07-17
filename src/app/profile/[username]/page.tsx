import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ProfileHeader } from "@/components/social/ProfileHeader";
import { ProfilePosts } from "@/components/social/ProfilePosts";
import { StoreGigsSection } from "@/components/opportunities/StoreGigsSection";
import {
  getBusinessProfileUrl,
  hasBusinessProfile,
  isBusinessPrimaryAccount,
  shouldRedirectPersonalToBusiness,
} from "@/lib/business";
import { requireUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { getFollowCounts, isFollowing } from "@/lib/social";
import { canViewPrivateProfile } from "@/lib/privacy";
import Link from "next/link";
import { Briefcase, Lock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const currentUser = await requireUser();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username.toLowerCase())
    .single();

  if (!profile) notFound();

  const typedProfile = profile as import("@/lib/types").Profile;

  if (shouldRedirectPersonalToBusiness(typedProfile, currentUser)) {
    redirect(getBusinessProfileUrl(typedProfile.username));
  }

  const showBusinessLink =
    hasBusinessProfile(typedProfile) && !isBusinessPrimaryAccount(typedProfile);

  const [counts, following, canViewContent] = await Promise.all([
    getFollowCounts(supabase, profile.id),
    currentUser.id !== profile.id
      ? isFollowing(supabase, currentUser.id, profile.id)
      : Promise.resolve(false),
    canViewPrivateProfile(supabase, currentUser.id, typedProfile),
  ]);

  return (
    <AppShell user={currentUser} wide>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vintage-ink-muted">
            Personal profile
          </p>
        </div>

        <ProfileHeader
          profile={typedProfile}
          currentUser={currentUser}
          initialCounts={counts}
          initialFollowing={following}
          variant="personal"
        />

        {showBusinessLink && (
          <Link
            href={getBusinessProfileUrl(typedProfile.username)}
            className="vintage-card flex items-center justify-between gap-4 p-4 transition hover:border-vintage-rust/40"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-sm bg-vintage-rust/10 text-vintage-rust">
                <Briefcase className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vintage-ink-muted">
                  Business storefront
                </p>
                <p className="font-display font-semibold text-vintage-ink">
                  {typedProfile.business_name}
                </p>
                <p className="text-xs text-vintage-ink-muted">
                  Sell, buy, and business listings — separate from personal posts
                </p>
              </div>
            </div>
            <span className="text-sm font-semibold text-vintage-rust">Open →</span>
          </Link>
        )}

        {canViewContent ? (
          <>
            <StoreGigsSection
              profile={typedProfile}
              currentUser={currentUser}
              variant="profile"
            />

            <div>
              <h2 className="font-display mb-4 text-lg font-semibold text-vintage-ink">
                Personal posts
              </h2>
              <ProfilePosts profileUserId={profile.id} currentUser={currentUser} />
            </div>
          </>
        ) : (
          <div className="vintage-card flex flex-col items-center gap-3 px-6 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-vintage-rust/10 text-vintage-rust">
              <Lock className="h-6 w-6" />
            </div>
            <p className="font-display text-lg font-bold text-vintage-ink">
              This account is private
            </p>
            <p className="max-w-sm text-sm text-vintage-ink-muted">
              Follow {typedProfile.display_name} to see their posts and listings.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
