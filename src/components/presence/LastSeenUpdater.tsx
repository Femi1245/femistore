"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { touchLastSeen } from "@/lib/presence";

/** Keeps the signed-in user's last_seen_at fresh while they use the app. */
export function LastSeenUpdater({ userId }: { userId: string }) {
  useEffect(() => {
    const supabase = createClient();

    const ping = () => {
      void touchLastSeen(supabase, userId);
    };

    ping();

    const interval = window.setInterval(ping, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") ping();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", ping);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", ping);
    };
  }, [userId]);

  return null;
}
