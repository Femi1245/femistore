import { redirect } from "next/navigation";
import { VerificationAdminDashboard } from "@/components/admin/VerificationAdminDashboard";
import { AppShell } from "@/components/layout/AppShell";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminVerificationPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const admin = await isPlatformAdmin(supabase, user.id);

  if (!admin) {
    redirect("/");
  }

  return (
    <AppShell user={user} wide>
      <VerificationAdminDashboard />
    </AppShell>
  );
}
