"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isCapacitorNative } from "@/lib/native-shell";

/**
 * Capacitor server.url is origin-only (required for plugin injection).
 * Send native app users from `/` to `/login` when they are not already
 * inside an app route.
 */
export function NativeAppEntryRedirect() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isCapacitorNative()) return;
    if (pathname !== "/") return;
    router.replace("/login");
  }, [pathname, router]);

  return null;
}
