import { BusinessDiscoveryList } from "@/components/business/BusinessDiscoveryList";
import { AppShell } from "@/components/layout/AppShell";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Discover businesses — Zumelia",
  description: "Find and explore businesses on Zumelia.",
};

export default async function DiscoverBusinessesPage() {
  const user = await requireUser();

  return (
    <AppShell user={user} wide>
      <BusinessDiscoveryList currentUserId={user.id} />
    </AppShell>
  );
}
