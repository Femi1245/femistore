"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  CircleDot,
  FileText,
  Heart,
  Loader2,
  Mail,
  MessageSquare,
  Radio,
  Repeat,
  UserPlus,
  Gift,
  Check,
  MailOpen,
  Phone,
  PhoneMissed,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  enrichNotification,
  formatNotificationTime,
  getNotificationHref,
  getNotificationText,
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
} from "@/lib/notifications";
import { markConversationUnread } from "@/lib/chat-folders";
import { ConnectionRequestsPanel } from "@/components/social/ConnectionRequestsPanel";
import { CHAT_UNREAD_REFRESH_EVENT } from "@/components/chat/useUnreadChatCount";
import { NOTIFICATION_UNREAD_REFRESH_EVENT } from "@/components/notifications/useUnreadNotificationCount";
import type { Notification, NotificationType, Profile } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { SectionTipBanner } from "@/components/layout/SectionTipBanner";

const iconMap: Record<
  NotificationType,
  React.ComponentType<{ className?: string }>
> = {
  follow: UserPlus,
  like: Heart,
  comment: MessageSquare,
  reshare: Repeat,
  new_post: FileText,
  new_status: CircleDot,
  message: Mail,
  live_started: Radio,
  live_ended: Radio,
  gift: Gift,
  connection_request: UserPlus,
  call: Phone,
  missed_call: PhoneMissed,
};

export function NotificationsView({
  currentUser,
  initialNotifications,
}: {
  currentUser: Profile;
  initialNotifications?: Notification[];
}) {
  const [notifications, setNotifications] = useState<Notification[]>(
    initialNotifications ?? [],
  );
  const [loading, setLoading] = useState(initialNotifications === undefined);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const usedInitial = useRef(initialNotifications !== undefined);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { notifications: data, error: loadError } = await loadNotifications(
      createClient(),
      currentUser.id,
    );
    setNotifications(data);
    if (loadError) setError(loadError);
    setLoading(false);
  }, [currentUser.id]);

  useEffect(() => {
    if (usedInitial.current && initialNotifications) {
      usedInitial.current = false;
      setNotifications(initialNotifications);
      setLoading(false);
      return;
    }
    void refresh();
  }, [refresh, initialNotifications]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-list:${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${currentUser.id}`,
        },
        async (payload) => {
          const incoming = payload.new as Notification;
          const enriched = await enrichNotification(supabase, incoming);
          setNotifications((prev) => {
            if (prev.some((n) => n.id === enriched.id)) return prev;
            return [enriched, ...prev];
          });
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event(NOTIFICATION_UNREAD_REFRESH_EVENT));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser.id]);

  async function handleMarkRead(
    e: React.MouseEvent,
    notification: Notification,
  ) {
    e.preventDefault();
    e.stopPropagation();
    if (notification.read_at) return;

    await markNotificationRead(
      createClient(),
      notification.id,
      currentUser.id,
    );
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notification.id
          ? { ...n, read_at: new Date().toISOString() }
          : n,
      ),
    );
    window.dispatchEvent(new Event(NOTIFICATION_UNREAD_REFRESH_EVENT));
  }

  async function handleMarkUnread(
    e: React.MouseEvent,
    notification: Notification,
  ) {
    e.preventDefault();
    e.stopPropagation();
    if (!notification.read_at) return;

    const supabase = createClient();
    await markNotificationUnread(supabase, notification.id, currentUser.id);

    if (
      notification.type === "message" &&
      notification.entity_type === "conversation" &&
      notification.entity_id
    ) {
      await markConversationUnread(
        supabase,
        currentUser.id,
        notification.entity_id,
      );
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(CHAT_UNREAD_REFRESH_EVENT));
      }
    }

    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notification.id ? { ...n, read_at: null } : n,
      ),
    );
    window.dispatchEvent(new Event(NOTIFICATION_UNREAD_REFRESH_EVENT));
  }

  async function handleClick(notification: Notification) {
    if (!notification.read_at) {
      await markNotificationRead(
        createClient(),
        notification.id,
        currentUser.id,
      );
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id
            ? { ...n, read_at: new Date().toISOString() }
            : n,
        ),
      );
    }
    window.dispatchEvent(new Event(NOTIFICATION_UNREAD_REFRESH_EVENT));
  }

  async function handleMarkAllRead() {
    setMarkingAll(true);
    await markAllNotificationsRead(createClient(), currentUser.id);
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        read_at: n.read_at ?? new Date().toISOString(),
      })),
    );
    setMarkingAll(false);
    window.dispatchEvent(new Event(NOTIFICATION_UNREAD_REFRESH_EVENT));
  }

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-vintage-ink">
            Notifications
          </h1>
          <p className="text-sm text-vintage-ink-muted">
            Follows, likes, comments, live streams, and more
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="vintage-btn shrink-0 px-3 py-1.5 text-xs disabled:opacity-50"
          >
            {markingAll ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              "Mark all read"
            )}
          </button>
        )}
      </div>

      <SectionTipBanner section="notifications" />

      <ConnectionRequestsPanel userId={currentUser.id} onChanged={refresh} />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-vintage-rust" />
        </div>
      ) : error ? (
        <div className="vintage-card p-6 text-center text-sm text-vintage-rust">
          {error}
        </div>
      ) : notifications.length === 0 ? (
        <div className="vintage-card flex flex-col items-center gap-3 p-10 text-center">
          <div className="mb-1 flex h-14 w-14 items-center justify-center rounded-2xl bg-vintage-rust/10 text-vintage-rust">
            <Bell className="h-7 w-7" />
          </div>
          <p className="font-display text-lg font-bold text-vintage-ink">
            No notifications yet
          </p>
          <p className="max-w-sm text-sm text-vintage-ink-muted">
            When someone connects with you, likes your post, comments, goes live,
            or sends a message, you&apos;ll see it here instantly.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <Link href="/feed" className="vintage-btn px-4 py-2 text-sm">
              Go to feed
            </Link>
            <Link href="/chat" className="vintage-btn-outline px-4 py-2 text-sm">
              Discover people
            </Link>
          </div>
        </div>
      ) : (
        <ul className="vintage-card divide-y divide-vintage-border overflow-hidden">
          {notifications.map((notification) => {
            const Icon = iconMap[notification.type] ?? Bell;
            const href = getNotificationHref(
              notification,
              notification.actor?.username,
            );
            const isUnread = !notification.read_at;
            const actorName =
              notification.actor?.display_name ??
              (notification.actor_id ? "Someone" : "System");

            return (
              <li
                key={notification.id}
                className={`flex items-stretch gap-1 ${
                  isUnread ? "bg-vintage-rust/5" : ""
                }`}
              >
                <div className="flex min-w-0 flex-1 items-stretch gap-3 px-4 py-3 transition-colors hover:bg-vintage-surface/60">
                  {notification.actor?.username ? (
                    <Link
                      href={`/profile/${notification.actor.username}`}
                      onClick={() => handleClick(notification)}
                      className="relative shrink-0 self-start"
                      title={`View ${actorName}'s profile`}
                    >
                      <Avatar
                        name={actorName}
                        avatarUrl={notification.actor.avatar_url}
                        size="md"
                      />
                      <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-vintage-rust text-[var(--vintage-btn-text)]">
                        <Icon className="h-3 w-3" />
                      </span>
                    </Link>
                  ) : (
                    <div className="relative shrink-0 self-start">
                      {notification.actor ? (
                        <Avatar
                          name={actorName}
                          avatarUrl={notification.actor.avatar_url}
                          size="md"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full vintage-card-inset">
                          <Icon className="h-5 w-5 text-vintage-rust" />
                        </div>
                      )}
                      <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-vintage-rust text-[var(--vintage-btn-text)]">
                        <Icon className="h-3 w-3" />
                      </span>
                    </div>
                  )}

                  <Link
                    href={href}
                    onClick={() => handleClick(notification)}
                    className="flex min-w-0 flex-1 gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm leading-snug ${
                          isUnread
                            ? "font-semibold text-vintage-ink"
                            : "text-vintage-ink"
                        }`}
                      >
                        {getNotificationText(notification)}
                      </p>
                      <p className="mt-1 text-xs text-vintage-ink-muted">
                        {formatNotificationTime(notification.created_at)}
                      </p>
                    </div>

                    {isUnread && (
                      <span
                        className="mt-2 h-2 w-2 shrink-0 rounded-full bg-vintage-rust"
                        aria-hidden
                      />
                    )}
                  </Link>
                </div>

                <div className="flex shrink-0 items-center pr-2">
                  {isUnread ? (
                    <button
                      type="button"
                      onClick={(e) => void handleMarkRead(e, notification)}
                      className="rounded-lg p-2 text-vintage-ink-muted transition hover:bg-vintage-paper-dark hover:text-vintage-ink"
                      title="Mark as read"
                      aria-label="Mark as read"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => void handleMarkUnread(e, notification)}
                      className="rounded-lg p-2 text-vintage-ink-muted transition hover:bg-vintage-paper-dark hover:text-vintage-rust"
                      title="Mark as unread"
                      aria-label="Mark as unread"
                    >
                      <MailOpen className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
