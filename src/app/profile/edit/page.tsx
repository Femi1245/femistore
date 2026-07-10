import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { BackButton } from "@/components/layout/BackButton";
import { ProfileEditForm } from "@/components/social/ProfileEditForm";
import { canAccessPersonalProfile, getBusinessProfileUrl } from "@/lib/business";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProfileEditPage() {
  const user = await requireUser();

  if (!canAccessPersonalProfile(user)) {
    redirect(getBusinessProfileUrl(user.username));
  }

  return (
    <AppShell user={user} wide>
      <div className="space-y-4">
        <BackButton
          fallbackHref={`/profile/${user.username}`}
          label="Back to profile"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-vintage-rust hover:underline"
        />
        <div className="vintage-card p-6">
          <h1 className="font-display mb-6 text-2xl font-bold text-vintage-ink">
            Edit profile
          </h1>
          <ProfileEditForm profile={user} />
        </div>
      </div>
    </AppShell>
  );
}
