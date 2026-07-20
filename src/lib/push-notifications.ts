import { shouldShowBrowserNotification } from "@/lib/notification-delivery";
import {
  enrichNotification,
  getNotificationHref,
  getNotificationText,
} from "@/lib/notifications";
import { loadNotificationPreferences } from "@/lib/notification-prefs";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Notification, NotificationType, Profile } from "@/lib/types";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

type PushTokenRow = {
  token: string;
  platform: string;
};

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data: Record<string, string>;
  sound: "default";
  priority: "high";
  channelId?: string;
};

export function isPushConfigured(): boolean {
  return !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

async function sendExpoPushBatch(messages: ExpoPushMessage[]): Promise<number> {
  if (!messages.length) return 0;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const accessToken = process.env.EXPO_ACCESS_TOKEN?.trim();
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  let sent = 0;
  for (const batch of chunk(messages, 100)) {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[push] Expo API error:", res.status, text);
      continue;
    }
    sent += batch.length;
  }
  return sent;
}

/** Send native push alerts to a user's registered phones. */
export async function sendPushForNotification(
  notification: Notification,
): Promise<{ sent: number; skipped?: string }> {
  if (!isPushConfigured()) {
    return { sent: 0, skipped: "Push not configured" };
  }

  const admin = createAdminClient();

  const [{ data: profile }, prefs, { data: tokens }] = await Promise.all([
    admin
      .from("profiles")
      .select("quiet_hours_start, quiet_hours_end, digest_mode, username")
      .eq("id", notification.recipient_id)
      .maybeSingle(),
    loadNotificationPreferences(admin, notification.recipient_id),
    admin
      .from("push_tokens")
      .select("token, platform")
      .eq("user_id", notification.recipient_id),
  ]);

  const deliveryProfile = (profile ?? {
    quiet_hours_start: null,
    quiet_hours_end: null,
    digest_mode: false,
  }) as Pick<
    Profile,
    "quiet_hours_start" | "quiet_hours_end" | "digest_mode" | "username"
  >;

  if (
    !shouldShowBrowserNotification({
      type: notification.type as NotificationType,
      prefs,
      profile: deliveryProfile,
    })
  ) {
    return { sent: 0, skipped: "Delivery rules" };
  }

  const rows = (tokens ?? []) as PushTokenRow[];
  if (!rows.length) {
    return { sent: 0, skipped: "No device tokens" };
  }

  const enriched = await enrichNotification(admin, notification);
  const href = getNotificationHref(
    enriched,
    enriched.actor?.username ?? deliveryProfile.username,
  );
  const body = getNotificationText(enriched);

  const messages: ExpoPushMessage[] = rows.map((row) => ({
    to: row.token,
    title: "Zumelia",
    body,
    data: {
      href,
      notificationId: notification.id,
      type: notification.type,
    },
    sound: "default",
    priority: "high",
    ...(row.platform === "android" ? { channelId: "default" } : {}),
  }));

  const sent = await sendExpoPushBatch(messages);
  return { sent };
}
