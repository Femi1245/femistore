import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SettingsView } from "@/components/settings/SettingsView";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <AppShell user={user} wide>
      <Suspense fallback={null}>
        <SettingsView profile={user} />
      </Suspense>
    </AppShell>
  );
}
