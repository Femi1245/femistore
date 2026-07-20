import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { getSupabase } from "@/lib/supabase";

const POLL_MS = 45_000;

export function useUnreadNotificationCount(userId: string | undefined) {
  const [unread, setUnread] = useState(0);

  const refreshCount = useCallback(async () => {
    if (!userId) {
      setUnread(0);
      return;
    }
    try {
      const count = await getUnreadNotificationCount(getSupabase(), userId);
      setUnread(count);
    } catch {
      // Ignore transient network errors.
    }
  }, [userId]);

  useEffect(() => {
    void refreshCount();

    const interval = setInterval(() => {
      if (AppState.currentState === "active") void refreshCount();
    }, POLL_MS);

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshCount();
    });

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [refreshCount]);

  return { unread, refreshCount };
}
