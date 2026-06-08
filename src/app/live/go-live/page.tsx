import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { GoLiveForm } from "@/components/live/GoLiveForm";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function GoLivePage() {
  const user = await requireUser();

  return (
    <AppShell user={user} wide>
      <div className="space-y-4">
        <Link
          href="/live"
          className="text-sm font-medium text-vintage-rust hover:underline"
        >
          ← Back to live streams
        </Link>
        <GoLiveForm />
      </div>
    </AppShell>
  );
}
