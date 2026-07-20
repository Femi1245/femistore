"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getUnreadNotificationCount } from "@/lib/notifications";

const POLL_MS = 45_000;

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
    const timer = window.setTimeout(() => {
      if (document.visibilityState === "visible") void refreshCount();
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [pathname, refreshCount]);

  useEffect(() => {
    void refreshCount();

    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void refreshCount();
    }, POLL_MS);
    const onFocus = () => void refreshCount();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshCount();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(NOTIFICATION_UNREAD_REFRESH_EVENT, onFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(NOTIFICATION_UNREAD_REFRESH_EVENT, onFocus);
    };
  }, [refreshCount]);

  return unread;
}
