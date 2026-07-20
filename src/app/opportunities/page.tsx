import nextDynamic from "next/dynamic";
import { AppShell } from "@/components/layout/AppShell";
import { loadOpportunities } from "@/lib/opportunities";
import { requireUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Opportunities — Zumelia",
  description: "Jobs, gigs, collabs, and internships posted by the Zumelia community.",
};

const OpportunityHub = nextDynamic(
  () =>
    import("@/components/opportunities/OpportunityHub").then(
      (m) => m.OpportunityHub,
    ),
  {
    loading: () => (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="vintage-card h-48 animate-pulse p-5" />
        ))}
      </div>
    ),
  },
);

export default async function OpportunitiesPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const initialOpportunities = await loadOpportunities(supabase);

  return (
    <AppShell user={user} wide>
      <OpportunityHub
        currentUser={user}
        initialOpportunities={initialOpportunities}
      />
    </AppShell>
  );
}
