import { OpportunityHub } from "@/components/opportunities/OpportunityHub";
import { AppShell } from "@/components/layout/AppShell";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Opportunities — Zumelia",
  description: "Jobs, gigs, collabs, and internships posted by the Zumelia community.",
};

export default async function OpportunitiesPage() {
  const user = await requireUser();

  return (
    <AppShell user={user} wide>
      <OpportunityHub currentUser={user} />
    </AppShell>
  );
}
