import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ProfileHeader } from "@/components/social/ProfileHeader";
import { ProfilePosts } from "@/components/social/ProfilePosts";
import { BusinessProfileShowcase } from "@/components/business/BusinessProfileShowcase";
import { hasBusinessProfile } from "@/lib/business";
import { requireUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { getFollowCounts, isFollowing } from "@/lib/social";

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
  const showBusinessShowcase = hasBusinessProfile(typedProfile);

  const [counts, following] = await Promise.all([
    getFollowCounts(supabase, profile.id),
    currentUser.id !== profile.id
      ? isFollowing(supabase, currentUser.id, profile.id)
      : Promise.resolve(false),
  ]);

  return (
    <AppShell user={currentUser} wide>
      <div className="space-y-6">
        <ProfileHeader
          profile={typedProfile}
          currentUser={currentUser}
          initialCounts={counts}
          initialFollowing={following}
        />
        {showBusinessShowcase && <BusinessProfileShowcase profile={typedProfile} />}
        <div>
          <h2 className="font-display mb-4 text-lg font-semibold text-vintage-ink">Posts</h2>
          <ProfilePosts
            profileUserId={profile.id}
            currentUser={currentUser}
          />
        </div>
      </div>
    </AppShell>
  );
}
