import nextDynamic from "next/dynamic";
import { AppShell } from "@/components/layout/AppShell";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const WatchHub = nextDynamic(
  () => import("@/components/watch/WatchHub").then((m) => m.WatchHub),
  {
    loading: () => (
      <div className="space-y-6">
        <div className="h-8 w-32 animate-pulse rounded bg-vintage-ink/10" />
        <div className="h-4 w-64 animate-pulse rounded bg-vintage-ink/10" />
        <div className="h-12 w-full animate-pulse rounded-lg bg-vintage-ink/10" />
      </div>
    ),
  },
);

export default async function WatchPage() {
  const user = await requireUser();

  return (
    <AppShell user={user}>
      <WatchHub user={user} />
    </AppShell>
  );
}
