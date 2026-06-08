import { WatchHub } from "@/components/watch/WatchHub";
import { AppShell } from "@/components/layout/AppShell";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function WatchPage() {
  const user = await requireUser();

  return (
    <AppShell user={user}>
      <WatchHub user={user} />
    </AppShell>
  );
}
