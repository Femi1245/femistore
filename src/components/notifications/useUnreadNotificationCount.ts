"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getUnreadNotificationCount } from "@/lib/notifications";

const POLL_MS = 30_000;

export const NOTIFICATION_UNREAD_REFRESH_EVENT = "zumelia:notification-unread-refresh";

export function useUnreadNotificationCount(userId: string) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  const refreshCount = useCallback(async () => {
    try {
      const count = await getUnreadNotificationCount(createClient(), userId);
      setUnread(count);
    } catch {
      // Ignore transient network errors.
    }
  }, [userId]);

  useEffect(() => {
    refreshCount();
  }, [refreshCount, pathname]);

  useEffect(() => {
    refreshCount();

    const interval = window.setInterval(refreshCount, POLL_MS);
    const onRefresh = () => refreshCount();
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshCount();
    };

    window.addEventListener("focus", onRefresh);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(NOTIFICATION_UNREAD_REFRESH_EVENT, onRefresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onRefresh);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(NOTIFICATION_UNREAD_REFRESH_EVENT, onRefresh);
    };
  }, [refreshCount]);

  return unread;
}
