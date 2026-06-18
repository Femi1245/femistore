"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  enrichNotification,
  getNotificationText,
} from "@/lib/notifications";
import type { Notification } from "@/lib/types";
import { useUnreadNotificationCount, NOTIFICATION_UNREAD_REFRESH_EVENT } from "@/components/notifications/useUnreadNotificationCount";

export function NotificationBell({ userId }: { userId: string }) {
  const pathname = usePathname();
  const unread = useUnreadNotificationCount(userId);
  const active = pathname === "/notifications" || pathname.startsWith("/notifications");

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-push:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        async (payload) => {
          window.dispatchEvent(new Event(NOTIFICATION_UNREAD_REFRESH_EVENT));
          if (typeof window !== "undefined" && "Notification" in window) {
            if (Notification.permission === "granted") {
              const incoming = payload.new as Notification;
              const enriched = await enrichNotification(createClient(), incoming);
              new Notification("Zumelia", {
                body: getNotificationText(enriched),
              });
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

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
