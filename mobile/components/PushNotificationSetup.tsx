import { useEffect, useRef } from "react";
import { router } from "expo-router";
import {
  Notifications,
  registerForPushNotifications,
} from "@/lib/push-notifications";
import { navigateFromNotificationHref } from "@/lib/notification-navigation";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { getSupabase } from "@/lib/supabase";

type Props = {
  userId: string;
  accessToken: string;
  onUnreadChange?: (count: number) => void;
};

/** Registers Expo push token and handles notification taps + badge updates. */
export function PushNotificationSetup({
  userId,
  accessToken,
  onUnreadChange,
}: Props) {
  const pushTokenRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const token = await registerForPushNotifications(accessToken);
      if (!cancelled) pushTokenRef.current = token;
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  useEffect(() => {
    async function syncBadge() {
      const count = await getUnreadNotificationCount(getSupabase(), userId);
      onUnreadChange?.(count);
      await Notifications.setBadgeCountAsync(count).catch(() => {});
    }

    void syncBadge();

    const channel = getSupabase()
      .channel(`push-badge:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        () => {
          void syncBadge();
        },
      )
      .subscribe();

    return () => {
      void getSupabase().removeChannel(channel);
    };
  }, [userId, onUnreadChange]);

  useEffect(() => {
    function handleResponse(response: Notifications.NotificationResponse) {
      const href = response.notification.request.content.data?.href;
      if (typeof href === "string" && href) {
        navigateFromNotificationHref(href);
        return;
      }
      router.push("/(tabs)/notifications");
    }

    const received = Notifications.addNotificationReceivedListener(() => {
      void getUnreadNotificationCount(getSupabase(), userId).then((count) => {
        onUnreadChange?.(count);
        void Notifications.setBadgeCountAsync(count).catch(() => {});
      });
    });

    const response = Notifications.addNotificationResponseReceivedListener(
      handleResponse,
    );

    void Notifications.getLastNotificationResponseAsync().then((last) => {
      if (last) handleResponse(last);
    });

    return () => {
      received.remove();
      response.remove();
    };
  }, [userId, onUnreadChange]);

  return null;
}
