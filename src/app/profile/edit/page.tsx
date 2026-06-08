import { AppShell } from "@/components/layout/AppShell";
import { ProfileEditForm } from "@/components/social/ProfileEditForm";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProfileEditPage() {
  const user = await requireUser();

  return (
    <AppShell user={user} wide>
      <div className="vintage-card p-6">
        <h1 className="font-display mb-6 text-2xl font-bold text-vintage-ink">Edit profile</h1>
        <ProfileEditForm profile={user} />
      </div>
    </AppShell>
  );
}
