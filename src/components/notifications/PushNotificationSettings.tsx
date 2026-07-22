"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import {
  canUseNativeLocalNotifications,
  ensureNativeNotificationChannel,
  ensureNativeNotificationPermission,
} from "@/lib/native-local-notifications";

export function PushNotificationSettings() {
  const [permission, setPermission] = useState<"default" | "granted" | "denied">(
    "default",
  );
  const [supported, setSupported] = useState(false);
  const [native, setNative] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (canUseNativeLocalNotifications()) {
      setNative(true);
      setSupported(true);
      void (async () => {
        try {
          const { LocalNotifications } = await import(
            "@capacitor/local-notifications"
          );
          const current = await LocalNotifications.checkPermissions();
          setPermission(
            current.display === "granted"
              ? "granted"
              : current.display === "denied"
                ? "denied"
                : "default",
          );
        } catch {
          setPermission("default");
        }
      })();
      return;
    }

    if (!("Notification" in window)) return;
    setSupported(true);
    setPermission(Notification.permission);
  }, []);

  const enable = useCallback(async () => {
    if (!supported) return;
    setBusy(true);
    setMessage(null);
    try {
      if (native) {
        const granted = await ensureNativeNotificationPermission();
        await ensureNativeNotificationChannel();
        setPermission(granted ? "granted" : "denied");
        setMessage(
          granted
            ? "App notifications enabled. You'll get phone alerts for new activity."
            : "Notifications blocked. Enable them in Android Settings → Apps → Zumelia.",
        );
      } else {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result === "granted") {
          setMessage(
            "Browser notifications enabled. You'll get alerts for new activity.",
          );
        } else if (result === "denied") {
          setMessage(
            "Notifications blocked. Enable them in your browser site settings.",
          );
        }
      }
    } catch {
      setMessage("Could not request notification permission.");
    }
    setBusy(false);
  }, [supported, native]);

  if (!supported) {
    return (
      <p className="text-sm text-vintage-ink-muted">
        Phone notifications need the Zumelia Android app (install from Download).
        Browser alerts are not available on this device.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-vintage-ink-muted">
        Get phone alerts for messages, likes, comments, calls, gifts, and live
        streams — respects quiet hours and the toggles below.
        {native
          ? " Keep Zumelia open or in recent apps for realtime alerts."
          : null}
      </p>
      {permission === "granted" ? (
        <div className="flex items-center gap-2 text-sm font-medium text-vintage-olive">
          <Bell className="h-4 w-4" />
          {native ? "App notifications are on" : "Browser notifications are on"}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void enable()}
          disabled={busy || permission === "denied"}
          className="vintage-btn inline-flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50"
        >
          <Bell className="h-4 w-4" />
          {busy
            ? "Enabling…"
            : native
              ? "Enable phone notifications"
              : "Enable browser notifications"}
        </button>
      )}
      {permission === "denied" && (
        <p className="flex items-center gap-2 text-xs text-vintage-ink-muted">
          <BellOff className="h-3.5 w-3.5" />
          {native
            ? "Unblock notifications in Android Settings → Apps → Zumelia → Notifications."
            : "Unblock notifications in your browser settings for this site."}
        </p>
      )}
      {message && <p className="text-sm text-vintage-ink-muted">{message}</p>}
    </div>
  );
}
