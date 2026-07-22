"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isCapacitorNative } from "@/lib/native-shell";

/**
 * Fallback if middleware/boot script miss: never leave native users on `/`
 * (public marketing site). Logged-in users are bounced /login → /feed by middleware.
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
