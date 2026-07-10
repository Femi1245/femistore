import { CreateOpportunityForm } from "@/components/opportunities/CreateOpportunityForm";
import { AppShell } from "@/components/layout/AppShell";
import { BackButton } from "@/components/layout/BackButton";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Post opportunity — Zumelia",
};

export default async function NewOpportunityPage() {
  const user = await requireUser();

  return (
    <AppShell user={user} wide>
      <div className="space-y-4">
        <BackButton
          fallbackHref="/opportunities"
          label="Back to opportunities"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-vintage-rust hover:underline"
        />
        <CreateOpportunityForm user={user} />
      </div>
    </AppShell>
  );
}
