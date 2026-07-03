import { redirect } from "next/navigation";
import { AdminHub } from "@/components/admin/AdminHub";
import { AppShell } from "@/components/layout/AppShell";
import { requireAdminPageUser } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireAdminPageUser("/admin");

  return (
    <AppShell user={user} wide>
      <AdminHub />
    </AppShell>
  );
}
