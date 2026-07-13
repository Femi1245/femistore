import { AppNav } from "@/components/layout/AppNav";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { AppShellMain } from "@/components/layout/AppShellMain";
import { StatusBar } from "@/components/status/StatusBar";
import { LastSeenUpdater } from "@/components/presence/LastSeenUpdater";
import type { Profile } from "@/lib/types";

export function AppShell({
  user,
  children,
  wide = false,
  showStatus = false,
  fullWidth = false,
  immersive = false,
}: {
  user: Profile;
  children: React.ReactNode;
  wide?: boolean;
  showStatus?: boolean;
  fullWidth?: boolean;
  /** Edge-to-edge content (e.g. TikTok-style live) — no main padding / bottom nav. */
  immersive?: boolean;
}) {
  const maxWidth = fullWidth ? "max-w-6xl" : wide ? "max-w-3xl" : "max-w-5xl";
  if (immersive) {
    return (
      <div className="fixed inset-0 z-[60] overflow-hidden bg-black">
        <LastSeenUpdater userId={user.id} />
        {children}
      </div>
    );
  }
  return (
    <div className="vintage-page min-h-screen pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0">
      <LastSeenUpdater userId={user.id} />
      <AppNav user={user} />
      {showStatus && <StatusBar user={user} />}
      <AppShellMain maxWidth={maxWidth}>{children}</AppShellMain>
      <MobileBottomNav user={user} />
    </div>
  );
}
