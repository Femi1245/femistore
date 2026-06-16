import { AppShell } from "@/components/layout/AppShell";
import { BusinessSetupForm } from "@/components/business/BusinessSetupForm";
import { requireUser } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Create business profile — Zumelia",
};

export default async function BusinessSetupPage() {
  const user = await requireUser();

  if (user.business_enabled && user.business_name && user.business_description?.trim()) {
    redirect("/profile/business/edit");
  }

  return (
    <AppShell user={user} wide>
      <div className="vintage-card p-6">
        <h1 className="font-display mb-2 text-2xl font-bold text-vintage-ink">
          Create business profile
        </h1>
        <p className="mb-6 text-sm text-vintage-ink-muted">
          Upgrade your personal account to advertise and showcase what you do.
        </p>
        <BusinessSetupForm profile={user} mode="create" />
      </div>
    </AppShell>
  );
}
