import nextDynamic from "next/dynamic";
import { FeedView } from "@/components/social/FeedView";
import { AppShell } from "@/components/layout/AppShell";
import { requireUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { loadFeed } from "@/lib/social";

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
  const supabase = await createClient();
  const initialPosts = await loadFeed(supabase, user.id, "friends");

  return (
    <AppShell user={user} showStatus fullWidth>
      <div className="flex justify-center gap-8">
        <div className="w-full max-w-2xl">
          <FeedView currentUser={user} initialPosts={initialPosts} />
        </div>
        <FeedSidebar currentUser={user} />
      </div>
    </AppShell>
  );
}
