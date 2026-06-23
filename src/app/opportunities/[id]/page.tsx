import Link from "next/link";
import { notFound } from "next/navigation";
import { OpportunityDetailView } from "@/components/opportunities/OpportunityDetailView";
import { AppShell } from "@/components/layout/AppShell";
import { loadOpportunityById } from "@/lib/opportunities";
import { requireUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const opp = await loadOpportunityById(supabase, id);
  return {
    title: opp ? `${opp.title} — Zumelia` : "Opportunity — Zumelia",
  };
}

export default async function OpportunityDetailPage({ params }: Props) {
  const user = await requireUser();
  const { id } = await params;
  const supabase = await createClient();
  const opportunity = await loadOpportunityById(supabase, id);

  if (!opportunity) {
    return (
      <AppShell user={user} wide>
        <div className="vintage-card p-10 text-center">
          <p className="font-display text-lg font-semibold text-vintage-ink">
            Opportunity not found
          </p>
          <p className="mt-2 text-sm text-vintage-ink-muted">
            It may have been removed, or you need to run the opportunities database
            schema in Supabase.
          </p>
          <Link href="/opportunities" className="vintage-btn mt-5 inline-block px-5 py-2.5 text-sm">
            Browse opportunities
          </Link>
        </div>
      </AppShell>
    );
  }

  if (!opportunity.is_active && opportunity.poster_id !== user.id) {
    notFound();
  }

  return (
    <AppShell user={user} wide>
      <OpportunityDetailView opportunity={opportunity} currentUser={user} />
    </AppShell>
  );
}
