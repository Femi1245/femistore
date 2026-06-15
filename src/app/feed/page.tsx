import { FeedView } from "@/components/social/FeedView";
import { FeedSidebar } from "@/components/social/FeedSidebar";
import { AppShell } from "@/components/layout/AppShell";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

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
