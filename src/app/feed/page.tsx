import nextDynamic from "next/dynamic";
import { FeedView } from "@/components/social/FeedView";
import { AppShell } from "@/components/layout/AppShell";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const FeedSidebar = nextDynamic(
  () => import("@/components/social/FeedSidebar").then((m) => m.FeedSidebar),
  {
    loading: () => (
      <aside className="hidden w-72 shrink-0 lg:block" aria-hidden>
        <div className="sticky top-[7.5rem] space-y-5">
          <div className="vintage-card h-64 animate-pulse" />
          <div className="vintage-card h-48 animate-pulse" />
        </div>
      </aside>
    ),
  },
);

export default async function FeedPage() {
  const user = await requireUser();

  return (
    <AppShell user={user} showStatus fullWidth>
      <div className="flex justify-center gap-8">
        <div className="w-full max-w-2xl">
          <FeedView currentUser={user} />
        </div>
        <FeedSidebar currentUser={user} />
      </div>
    </AppShell>
  );
}
