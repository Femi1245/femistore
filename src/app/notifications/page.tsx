import { NotificationsView } from "@/components/notifications/NotificationsView";
import { AppShell } from "@/components/layout/AppShell";
import { requireUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { loadNotifications } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { notifications: initialNotifications } = await loadNotifications(
    supabase,
    user.id,
  );

  return (
    <AppShell user={user} wide>
      <NotificationsView
        currentUser={user}
        initialNotifications={initialNotifications}
      />
    </AppShell>
  );
}
