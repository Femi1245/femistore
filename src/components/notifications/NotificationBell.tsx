"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { useUnreadNotificationCount } from "@/components/notifications/useUnreadNotificationCount";

/** Nav bell UI only — realtime push lives in NotificationPushListener (mounted once). */
export function NotificationBell({ userId }: { userId: string }) {
  const pathname = usePathname();
  const unread = useUnreadNotificationCount(userId);
  const active = pathname === "/notifications" || pathname.startsWith("/notifications");

  return (
    <Link
      href="/notifications"
      className={`nav-icon-btn ${active ? "nav-icon-btn-active" : ""}`}
      aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
      title="Notifications"
    >
      <Bell className="h-[18px] w-[18px]" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-vintage-rust px-1 text-[10px] font-bold text-[var(--vintage-btn-text)]">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
