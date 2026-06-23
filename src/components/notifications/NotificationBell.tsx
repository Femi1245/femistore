"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  enrichNotification,
  getNotificationHref,
  getNotificationText,
} from "@/lib/notifications";
import { loadNotificationPreferences } from "@/lib/notification-prefs";
import { shouldShowBrowserNotification } from "@/lib/notification-delivery";
import type { Notification, Profile } from "@/lib/types";
import {
  useUnreadNotificationCount,
  NOTIFICATION_UNREAD_REFRESH_EVENT,
} from "@/components/notifications/useUnreadNotificationCount";

export function NotificationBell({ userId }: { userId: string }) {
  const pathname = usePathname();
  const unread = useUnreadNotificationCount(userId);
  const active = pathname === "/notifications" || pathname.startsWith("/notifications");
  const profileRef = useRef<Pick<
    Profile,
    "quiet_hours_start" | "quiet_hours_end" | "digest_mode" | "username"
  > | null>(null);
  const prefsRef = useRef<Awaited<ReturnType<typeof loadNotificationPreferences>> | null>(
    null,
  );

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const [{ data: profile }, prefs] = await Promise.all([
        supabase
          .from("profiles")
          .select("quiet_hours_start, quiet_hours_end, digest_mode, username")
          .eq("id", userId)
          .maybeSingle(),
        loadNotificationPreferences(supabase, userId),
      ]);
      profileRef.current = profile as Profile | null;
      prefsRef.current = prefs;
    })();
  }, [userId]);

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

          if (typeof window === "undefined" || !("Notification" in window)) return;
          if (Notification.permission !== "granted") return;

          const incoming = payload.new as Notification;
          const profile = profileRef.current;
          if (
            !shouldShowBrowserNotification({
              type: incoming.type,
              prefs: prefsRef.current,
              profile: profile ?? { quiet_hours_start: null, quiet_hours_end: null, digest_mode: false },
            })
          ) {
            return;
          }

          const enriched = await enrichNotification(createClient(), incoming);
          const href = getNotificationHref(
            enriched,
            enriched.actor?.username ?? profile?.username,
          );

          const notification = new Notification("Zumelia", {
            body: getNotificationText(enriched),
            icon: "/pwa/icon-192.png",
            tag: enriched.id,
          });
          notification.onclick = () => {
            window.focus();
            window.location.href = href;
            notification.close();
          };
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

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
