import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { LiveSetupNotice } from "@/components/live/LiveSetupNotice";
import { LiveStreamList } from "@/components/live/LiveStreamList";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  const user = await requireUser();

  return (
    <AppShell user={user} wide>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-vintage-ink">Live</h1>
            <p className="text-sm text-vintage-ink-muted">
              Watch live video from people around the world
            </p>
          </div>
          <Link href="/live/go-live" className="vintage-btn px-5 py-2.5 text-sm">
            Go live
          </Link>
        </div>
        <LiveSetupNotice />
        <LiveStreamList />
      </div>
    </AppShell>
  );
}
