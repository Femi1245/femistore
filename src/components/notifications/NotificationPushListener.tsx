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
import {
  attachNativeNotificationTapHandler,
  canUseNativeLocalNotifications,
  ensureNativeNotificationPermission,
  ensureNativeNotificationChannel,
  showNativeLocalNotification,
} from "@/lib/native-local-notifications";
import type { Notification, Profile } from "@/lib/types";
import { NOTIFICATION_UNREAD_REFRESH_EVENT } from "@/components/notifications/useUnreadNotificationCount";

/**
 * Realtime alerts for new notification rows.
 * Capacitor APK → Android Local Notifications (browser Notification API is unreliable in WebView).
 * Web/PWA → browser Notification when permitted.
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
    let detachTap: (() => void) | undefined;

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

      if (canUseNativeLocalNotifications()) {
        await ensureNativeNotificationPermission();
        await ensureNativeNotificationChannel();
        detachTap = await attachNativeNotificationTapHandler();
        return;
      }

      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "default") {
          try {
            await Notification.requestPermission();
          } catch {
            // user dismissed
          }
        }
      }
    })();

    return () => {
      detachTap?.();
    };
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
          const body = getNotificationText(enriched);
          const isCallAlert =
            enriched.type === "call" || enriched.type === "missed_call";
          const onNotificationsPage =
            typeof window !== "undefined" &&
            window.location.pathname.startsWith("/notifications");

          // Native APK: always use system tray notifications (except quiet
          // when already reading the notifications inbox, unless it's a call).
          if (canUseNativeLocalNotifications()) {
            if (onNotificationsPage && !isCallAlert) return;
            await showNativeLocalNotification({
              id: enriched.id,
              body,
              href,
            });
            return;
          }

          if (typeof window === "undefined" || !("Notification" in window)) return;
          if (Notification.permission !== "granted") return;

          // Web: skip OS toast when the tab is focused (bell still updates),
          // except for calls.
          if (
            !isCallAlert &&
            document.visibilityState === "visible" &&
            document.hasFocus()
          ) {
            return;
          }

          const notification = new Notification("Zumelia", {
            body,
            icon: "/pwa/icon-192.png",
            tag: enriched.id,
            requireInteraction: isCallAlert,
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
