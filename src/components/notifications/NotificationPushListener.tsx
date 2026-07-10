"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  enrichNotification,
  getNotificationHref,
  getNotificationText,
} from "@/lib/notifications";
import { loadNotificationPreferences } from "@/lib/notification-prefs";
import { shouldShowBrowserNotification } from "@/lib/notification-delivery";
import type { Notification, Profile } from "@/lib/types";
import { NOTIFICATION_UNREAD_REFRESH_EVENT } from "@/components/notifications/useUnreadNotificationCount";

/**
 * Single realtime subscription for browser push on new notifications.
 * Mount once per page in AppNav — not inside NotificationBell (renders twice in nav).
 */
export function NotificationPushListener({ userId }: { userId: string }) {
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
    const channelName = `notifications-push:${userId}`;

    const existing = supabase
      .getChannels()
      .find((ch) => ch.topic === `realtime:${channelName}`);
    if (existing) {
      void supabase.removeChannel(existing);
    }

    const channel = supabase
      .channel(channelName)
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
              profile: profile ?? {
                quiet_hours_start: null,
                quiet_hours_end: null,
                digest_mode: false,
              },
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
            window.location.assign(href);
            notification.close();
          };
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return null;
}
