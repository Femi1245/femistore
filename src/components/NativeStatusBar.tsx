"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { hasCapacitorPlugin, isCapacitorNative } from "@/lib/native-shell";

/**
 * Edge-to-edge system bars in the Capacitor APK: content draws under the
 * status bar, and icon style follows light/dark theme.
 */
export function NativeStatusBar() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isCapacitorNative() && !hasCapacitorPlugin("StatusBar")) return;

    let cancelled = false;

    void (async () => {
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        if (cancelled) return;

        await StatusBar.setOverlaysWebView({ overlay: true });
        await StatusBar.setBackgroundColor({ color: "#00000000" });

        const dark = resolvedTheme === "dark";
        // Style.Dark = dark icons (light backgrounds); Style.Light = light icons.
        await StatusBar.setStyle({
          style: dark ? Style.Light : Style.Dark,
        });
      } catch {
        // Web / missing plugin — ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resolvedTheme]);

  return null;
}
