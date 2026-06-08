import { NotificationsView } from "@/components/notifications/NotificationsView";
import { AppShell } from "@/components/layout/AppShell";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireUser();

  return (
    <AppShell user={user} wide>
      <NotificationsView currentUser={user} />
    </AppShell>
  );
}
