import type { SupabaseClient } from "@supabase/supabase-js";
import type { Notification, NotificationType, Profile } from "./types";

export async function loadNotifications(
  supabase: SupabaseClient,
  userId: string,
  limit = 50,
): Promise<{ notifications: Notification[]; error?: string }> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (error.code === "PGRST205") {
      return {
        notifications: [],
        error:
          "Notifications are not set up yet. Run supabase/notifications-schema.sql in your Supabase SQL Editor.",
      };
    }
    return { notifications: [], error: error.message };
  }

  if (!data?.length) return { notifications: [] };

  const actorIds = [
    ...new Set(
      (data as Notification[])
        .map((n) => n.actor_id)
        .filter((id): id is string => !!id),
    ),
  ];

  let actorMap = new Map<string, Profile>();
  if (actorIds.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("id", actorIds);
    actorMap = new Map((profiles as Profile[] | null)?.map((p) => [p.id, p]));
  }

  return {
    notifications: (data as Notification[]).map((n) => ({
      ...n,
      actor: n.actor_id ? actorMap.get(n.actor_id) : undefined,
    })),
  };
}

export async function getUnreadNotificationCount(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .is("read_at", null);

  if (error) return 0;
  return count ?? 0;
}

export async function markNotificationRead(
  supabase: SupabaseClient,
  notificationId: string,
  userId: string,
) {
  return supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("recipient_id", userId);
}

export async function markAllNotificationsRead(
  supabase: SupabaseClient,
  userId: string,
) {
  return supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", userId)
    .is("read_at", null);
}

export function getNotificationHref(
  notification: Notification,
  actorUsername?: string,
): string {
  switch (notification.type) {
    case "follow":
      return actorUsername ? `/profile/${actorUsername}` : "/feed";
    case "like":
    case "comment":
    case "reshare":
    case "new_post":
      return "/feed";
    case "new_status":
      return "/feed";
    case "message":
      return "/chat";
    case "live_started":
      return `/live/${notification.entity_id}`;
    case "live_ended":
      return notification.actor_id ? `/profile/${actorUsername ?? ""}` : "/live";
    case "gift":
      if (notification.entity_type === "live") return "/live";
      if (notification.entity_type === "chat") return "/chat";
      return actorUsername ? `/profile/${actorUsername}` : "/feed";
    default:
      return "/feed";
  }
}

export function getNotificationText(notification: Notification): string {
  const name = notification.actor?.display_name ?? "Someone";

  switch (notification.type) {
    case "follow":
      return `${name} connected with you`;
    case "like":
      return `${name} liked your post`;
    case "comment":
      return notification.message
        ? `${name} commented: "${notification.message}"`
        : `${name} commented on your post`;
    case "reshare":
      return `${name} reshared your post`;
    case "new_post":
      return notification.message
        ? `${name} posted: "${notification.message}"`
        : `${name} shared a new post`;
    case "new_status":
      return notification.message
        ? `${name} added a status: "${notification.message}"`
        : `${name} added a new status`;
    case "message":
      return notification.message
        ? `${name} sent you a message: "${notification.message}"`
        : `${name} sent you a message`;
    case "live_started":
      return notification.message
        ? `${name} is live: ${notification.message}`
        : `${name} started a live stream`;
    case "live_ended":
      if (!notification.actor_id) {
        return notification.message ?? "Your live stream has ended";
      }
      return notification.message
        ? `${name}'s live stream ended: ${notification.message}`
        : `${name}'s live stream has ended`;
    case "gift":
      return notification.message
        ? `${name} sent you a gift: ${notification.message}`
        : `${name} sent you a gift`;
    default:
      return "You have a new notification";
  }
}

export function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case "follow":
      return "user-plus";
    case "like":
      return "heart";
    case "comment":
      return "message-square";
    case "reshare":
      return "repeat";
    case "new_post":
      return "file-text";
    case "new_status":
      return "circle-dot";
    case "message":
      return "mail";
    case "live_started":
      return "radio";
    case "live_ended":
      return "radio-off";
    case "gift":
      return "gift";
    default:
      return "bell";
  }
}

export function formatNotificationTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export async function enrichNotification(
  supabase: SupabaseClient,
  notification: Notification,
): Promise<Notification> {
  if (!notification.actor_id || notification.actor) return notification;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", notification.actor_id)
    .maybeSingle();

  return {
    ...notification,
    actor: (data as Profile | null) ?? undefined,
  };
}
