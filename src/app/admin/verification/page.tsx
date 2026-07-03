import { VerificationAdminDashboard } from "@/components/admin/VerificationAdminDashboard";
import { AppShell } from "@/components/layout/AppShell";
import { requireAdminPageUser } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export default async function AdminVerificationPage() {
  const user = await requireAdminPageUser("/admin/verification");

  return (
    <AppShell user={user} wide>
      <VerificationAdminDashboard />
    </AppShell>
  );
}
