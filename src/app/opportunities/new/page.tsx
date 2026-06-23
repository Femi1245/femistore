import { CreateOpportunityForm } from "@/components/opportunities/CreateOpportunityForm";
import { AppShell } from "@/components/layout/AppShell";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Post opportunity — Zumelia",
};

export default async function NewOpportunityPage() {
  const user = await requireUser();

  return (
    <AppShell user={user} wide>
      <CreateOpportunityForm user={user} />
    </AppShell>
  );
}
