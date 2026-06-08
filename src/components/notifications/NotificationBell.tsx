"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  enrichNotification,
  getUnreadNotificationCount,
} from "@/lib/notifications";
import type { Notification, Profile } from "@/lib/types";

export function NotificationBell({ userId }: { userId: string }) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const active = pathname === "/notifications" || pathname.startsWith("/notifications");

  const refreshCount = useCallback(async () => {
    const count = await getUnreadNotificationCount(createClient(), userId);
    setUnread(count);
  }, [userId]);

  useEffect(() => {
    refreshCount();
  }, [refreshCount, pathname]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        async (payload) => {
          setUnread((prev) => prev + 1);

          if (typeof window !== "undefined" && "Notification" in window) {
            if (Notification.permission === "granted") {
              const incoming = payload.new as Notification;
              const enriched = await enrichNotification(supabase, incoming);
              const { getNotificationText } = await import("@/lib/notifications");
              new Notification("iTunes", {
                body: getNotificationText(enriched),
              });
            }
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        () => {
          refreshCount();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refreshCount]);

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
      className={`relative flex items-center justify-center rounded-sm p-2 vintage-nav-link ${
        active ? "vintage-nav-link-active" : ""
      }`}
      aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
    >
      <Bell className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-vintage-rust px-1 text-[10px] font-bold text-[var(--vintage-btn-text)]">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
