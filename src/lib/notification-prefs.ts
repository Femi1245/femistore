import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationType } from "./types";

export const NOTIFICATION_TYPES: { type: NotificationType; label: string }[] = [
  { type: "follow", label: "New followers" },
  { type: "like", label: "Likes on your posts" },
  { type: "comment", label: "Comments" },
  { type: "reshare", label: "Reshares" },
  { type: "new_post", label: "Posts from people you follow" },
  { type: "new_status", label: "Status updates" },
  { type: "message", label: "Messages" },
  { type: "live_started", label: "Live streams started" },
  { type: "live_ended", label: "Live streams ended" },
  { type: "gift", label: "Gifts received" },
];

export async function loadNotificationPreferences(
  supabase: SupabaseClient,
  userId: string,
): Promise<Record<NotificationType, boolean>> {
  const { data } = await supabase
    .from("notification_preferences")
    .select("notification_type, enabled")
    .eq("user_id", userId);

  const defaults = Object.fromEntries(
    NOTIFICATION_TYPES.map((t) => [t.type, true]),
  ) as Record<NotificationType, boolean>;

  for (const row of data ?? []) {
    defaults[row.notification_type as NotificationType] = row.enabled;
  }

  return defaults;
}

export async function setNotificationPreference(
  supabase: SupabaseClient,
  userId: string,
  type: NotificationType,
  enabled: boolean,
): Promise<{ error?: string }> {
  const { error } = await supabase.from("notification_preferences").upsert({
    user_id: userId,
    notification_type: type,
    enabled,
  });

  if (error) return { error: error.message };
  return {};
}
