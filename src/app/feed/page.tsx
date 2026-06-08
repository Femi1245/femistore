import { FeedView } from "@/components/social/FeedView";
import { AppShell } from "@/components/layout/AppShell";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const user = await requireUser();

  return (
    <AppShell user={user} wide>
      <FeedView currentUser={user} />
    </AppShell>
  );
}
