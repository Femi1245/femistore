"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";

export function PushNotificationSettings() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setSupported(true);
    setPermission(Notification.permission);
  }, []);

  const enable = useCallback(async () => {
    if (!supported) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        setMessage("Browser notifications enabled. You'll get alerts for new activity.");
      } else if (result === "denied") {
        setMessage("Notifications blocked. Enable them in your browser site settings.");
      }
    } catch {
      setMessage("Could not request notification permission.");
    }
    setBusy(false);
  }, [supported]);

  if (!supported) {
    return (
      <p className="text-sm text-vintage-ink-muted">
        Browser notifications are not supported on this device.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-vintage-ink-muted">
        Get instant alerts for messages, likes, comments, calls, gifts, and live
        streams — respects quiet hours and the toggles below.
      </p>
      {permission === "granted" ? (
        <div className="flex items-center gap-2 text-sm font-medium text-vintage-olive">
          <Bell className="h-4 w-4" />
          Browser notifications are on
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void enable()}
          disabled={busy || permission === "denied"}
          className="vintage-btn inline-flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50"
        >
          <Bell className="h-4 w-4" />
          {busy ? "Enabling…" : "Enable browser notifications"}
        </button>
      )}
      {permission === "denied" && (
        <p className="flex items-center gap-2 text-xs text-vintage-ink-muted">
          <BellOff className="h-3.5 w-3.5" />
          Unblock notifications in your browser settings for this site.
        </p>
      )}
      {message && <p className="text-sm text-vintage-ink-muted">{message}</p>}
    </div>
  );
}
