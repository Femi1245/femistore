import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { BusinessOwnerPanel } from "@/components/business/BusinessOwnerPanel";
import { BusinessPageHeader } from "@/components/business/BusinessPageHeader";
import { BusinessPosts } from "@/components/business/BusinessPosts";
import { hasBusinessProfile } from "@/lib/business";
import { requireUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { getFollowCounts, isFollowing } from "@/lib/social";

export const dynamic = "force-dynamic";

export default async function BusinessPage({
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
  if (!hasBusinessProfile(typedProfile)) notFound();

  const [counts, following] = await Promise.all([
    getFollowCounts(supabase, profile.id),
    currentUser.id !== profile.id
      ? isFollowing(supabase, currentUser.id, profile.id)
      : Promise.resolve(false),
  ]);

  const isOwn = currentUser.id === profile.id;

  return (
    <AppShell user={currentUser} wide>
      <div className="space-y-6">
        <BusinessPageHeader
          profile={typedProfile}
          currentUser={currentUser}
          initialCounts={counts}
          initialFollowing={following}
        />

        {isOwn && <BusinessOwnerPanel profile={typedProfile} />}

        <div>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vintage-ink-muted">
                Buy & sell · Storefront
              </p>
              <h2 className="font-display text-xl font-semibold text-vintage-ink">
                Listings & offers
              </h2>
              <p className="mt-1 text-sm text-vintage-ink-muted">
                Products and services for customers — separate from personal social posts.
              </p>
            </div>
          </div>
          <BusinessPosts
            profileUserId={profile.id}
            currentUser={currentUser}
          />
        </div>
      </div>
    </AppShell>
  );
}
