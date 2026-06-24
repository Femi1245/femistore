import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { LiveHub } from "@/components/live/LiveHub";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  const user = await requireUser();

  return (
    <AppShell user={user} wide>
      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="h-10 w-48 animate-pulse rounded-lg bg-vintage-paper-dark" />
            <div className="h-64 animate-pulse rounded-lg bg-vintage-paper-dark" />
          </div>
        }
      >
        <LiveHub />
      </Suspense>
    </AppShell>
  );
}
