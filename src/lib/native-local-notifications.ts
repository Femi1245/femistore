/**
 * Real Android/iOS tray alerts for the Capacitor APK.
 * Browser Notification API is unreliable (or silent) inside WebView.
 */

import { hasCapacitorPlugin, isCapacitorNative } from "@/lib/native-shell";

const CHANNEL_ID = "zumelia_alerts";

export function canUseNativeLocalNotifications(): boolean {
  if (typeof window === "undefined") return false;
  return isCapacitorNative() || hasCapacitorPlugin("LocalNotifications");
}

function notificationIdToInt(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  const positive = Math.abs(hash);
  return positive === 0 ? 1 : positive;
}

export async function ensureNativeNotificationPermission(): Promise<boolean> {
  if (!canUseNativeLocalNotifications()) return false;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const current = await LocalNotifications.checkPermissions();
    if (current.display === "granted") return true;
    const next = await LocalNotifications.requestPermissions();
    return next.display === "granted";
  } catch (err) {
    console.warn("[native-notif] permission failed:", err);
    return false;
  }
}

export async function ensureNativeNotificationChannel(): Promise<void> {
  if (!canUseNativeLocalNotifications()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: "Zumelia alerts",
      description: "Messages, likes, comments, calls, and live activity",
      importance: 5,
      visibility: 1,
      sound: "default",
      vibration: true,
    });
  } catch {
    // Older Android / plugin already created the channel
  }
}

export async function showNativeLocalNotification(opts: {
  id: string;
  title?: string;
  body: string;
  href: string;
}): Promise<boolean> {
  if (!canUseNativeLocalNotifications()) return false;

  try {
    const granted = await ensureNativeNotificationPermission();
    if (!granted) return false;
    await ensureNativeNotificationChannel();

    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationIdToInt(opts.id),
          title: opts.title ?? "Zumelia",
          body: opts.body,
          channelId: CHANNEL_ID,
          extra: { href: opts.href, notificationId: opts.id },
          schedule: { at: new Date(Date.now() + 250) },
          sound: "default",
          smallIcon: "ic_stat_icon_config_sample",
          iconColor: "#C45C26",
        },
      ],
    });
    return true;
  } catch (err) {
    console.warn("[native-notif] schedule failed:", err);
    return false;
  }
}

/** Navigate when the user taps a tray notification. */
export async function attachNativeNotificationTapHandler(): Promise<() => void> {
  if (!canUseNativeLocalNotifications()) return () => {};

  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const handle = await LocalNotifications.addListener(
      "localNotificationActionPerformed",
      (event) => {
        const href = (event.notification.extra as { href?: string } | undefined)?.href;
        if (href && typeof window !== "undefined") {
          window.location.assign(href);
        }
      },
    );
    return () => {
      void handle.remove();
    };
  } catch {
    return () => {};
  }
}
