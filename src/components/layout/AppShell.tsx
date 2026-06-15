import { AppNav } from "@/components/layout/AppNav";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { StatusBar } from "@/components/status/StatusBar";
import type { Profile } from "@/lib/types";

export function AppShell({
  user,
  children,
  wide = false,
  showStatus = false,
  fullWidth = false,
}: {
  user: Profile;
  children: React.ReactNode;
  wide?: boolean;
  showStatus?: boolean;
  fullWidth?: boolean;
}) {
  const maxWidth = fullWidth ? "max-w-6xl" : wide ? "max-w-3xl" : "max-w-5xl";
  return (
    <div className="vintage-page min-h-screen pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <AppNav user={user} />
      {showStatus && <StatusBar user={user} />}
      <main className={`mx-auto px-4 py-6 ${maxWidth}`}>{children}</main>
      <MobileBottomNav />
    </div>
  );
}
