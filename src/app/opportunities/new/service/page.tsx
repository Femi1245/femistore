import { redirect } from "next/navigation";
import {
  canCreateServiceGigs,
  getBusinessProfileUrl,
  hasBusinessProfile,
} from "@/lib/business";
import { CreateServiceGigForm } from "@/components/opportunities/CreateServiceGigForm";
import { SellerModeGate } from "@/components/business/SellerModeGate";
import { AppShell } from "@/components/layout/AppShell";
import { BackButton } from "@/components/layout/BackButton";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "List your service — Zumelia",
};

export default async function NewServiceGigPage() {
  const user = await requireUser();

  if (!hasBusinessProfile(user)) {
    redirect("/profile/business/setup");
  }

  if (!canCreateServiceGigs(user)) {
    redirect(`${getBusinessProfileUrl(user.username)}?seller=1`);
  }

  return (
    <AppShell user={user} wide>
      <div className="space-y-4">
        <BackButton
          fallbackHref={getBusinessProfileUrl(user.username)}
          label="Back to storefront"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-vintage-rust hover:underline"
        />
        <SellerModeGate user={user}>
          <CreateServiceGigForm user={user} />
        </SellerModeGate>
      </div>
    </AppShell>
  );
}
