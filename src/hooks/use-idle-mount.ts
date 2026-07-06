"use client";

import { useEffect, useState } from "react";

/** Defer non-critical UI until the browser is idle (or after a short timeout). */
export function useIdleMount(timeoutMs = 2500) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const activate = () => {
      if (!cancelled) setMounted(true);
    };

    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(activate, { timeout: timeoutMs });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }

    const timer = window.setTimeout(activate, Math.min(timeoutMs, 1200));
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [timeoutMs]);

  return mounted;
}
