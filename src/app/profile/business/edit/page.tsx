import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { BusinessSetupForm } from "@/components/business/BusinessSetupForm";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Edit business profile — Zumelia",
};

export default async function BusinessEditPage() {
  const user = await requireUser();

  if (!user.business_enabled && user.account_kind !== "business") {
    redirect("/profile/business/setup");
  }

  return (
    <AppShell user={user} wide>
      <div className="vintage-card p-6">
        <h1 className="font-display mb-2 text-2xl font-bold text-vintage-ink">
          Business profile
        </h1>
        <p className="mb-6 text-sm text-vintage-ink-muted">
          Keep your showcase up to date so customers can find you.
        </p>
        <BusinessSetupForm profile={user} mode="edit" />
      </div>
    </AppShell>
  );
}
