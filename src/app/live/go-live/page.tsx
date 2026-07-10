import { AppShell } from "@/components/layout/AppShell";
import { BackButton } from "@/components/layout/BackButton";
import { GoLiveForm } from "@/components/live/GoLiveForm";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function GoLivePage() {
  const user = await requireUser();

  return (
    <AppShell user={user} wide>
      <div className="space-y-4">
        <BackButton
          fallbackHref="/live"
          label="Back to live streams"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-vintage-rust hover:underline"
        />
        <GoLiveForm />
      </div>
    </AppShell>
  );
}
