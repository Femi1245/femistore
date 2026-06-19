import { AppShell } from "@/components/layout/AppShell";
import { BirthdaySetupForm } from "@/components/profile/BirthdaySetupForm";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function BirthdayPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await requireUser();
  const { next } = await searchParams;
  const nextHref = next?.startsWith("/") ? next : "/chat";

  return (
    <AppShell user={user} wide>
      <div className="vintage-card mx-auto max-w-md p-6 sm:p-8">
        <BirthdaySetupForm profile={user} nextHref={nextHref} />
      </div>
    </AppShell>
  );
}
