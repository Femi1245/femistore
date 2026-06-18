"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, Home, MessageCircle, Play, User } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { UnreadChatBadge } from "@/components/chat/UnreadChatBadge";
import { useUnreadChatCount } from "@/components/chat/useUnreadChatCount";
import { useUnreadNotificationCount } from "@/components/notifications/useUnreadNotificationCount";
import {
  getMobileAppearance,
  MOBILE_APPEARANCE_EVENT,
  type MobileAppearance,
} from "@/lib/mobile-appearance";

type Tab = {
  href: string;
  label: string;
  icon: typeof Home;
  match: (p: string) => boolean;
  center?: boolean;
  badge?: "chat" | "notifications";
};

function buildTabs(username: string): Tab[] {
  const profileHref = `/profile/${username}`;
  return [
    {
      href: "/feed",
      label: "Home",
      icon: Home,
      match: (p) => p === "/feed" || p === "/",
    },
    {
      href: "/watch",
      label: "Watch",
      icon: Play,
      match: (p) => p.startsWith("/watch"),
    },
    {
      href: "/chat",
      label: "Chat",
      icon: MessageCircle,
      match: (p) => p === "/chat" || p.startsWith("/chat"),
      center: true,
      badge: "chat",
    },
    {
      href: "/notifications",
      label: "Alerts",
      icon: Bell,
      match: (p) => p.startsWith("/notifications"),
      badge: "notifications",
    },
    {
      href: profileHref,
      label: "You",
      icon: User,
      match: (p) =>
        p.startsWith("/profile/") &&
        !p.endsWith("/edit") &&
        !p.startsWith("/profile/settings") &&
        !p.startsWith("/profile/business"),
    },
  ];
}

export function MobileBottomNav({
  userId,
  username,
  displayName,
  avatarUrl,
}: {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}) {
  const pathname = usePathname();
  const unreadChats = useUnreadChatCount(userId);
  const unreadNotifications = useUnreadNotificationCount(userId);
  const [appearance, setAppearance] = useState<MobileAppearance>(() =>
    getMobileAppearance(),
  );

  useEffect(() => {
    const sync = () => setAppearance(getMobileAppearance());
    window.addEventListener(MOBILE_APPEARANCE_EVENT, sync);
    return () => window.removeEventListener(MOBILE_APPEARANCE_EVENT, sync);
  }, []);

  const tabs = buildTabs(username);

  return (
    <nav
      className="mobile-tab-bar fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-lg items-end justify-around px-2 pt-1.5 pb-1">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          const badgeCount =
            tab.badge === "chat"
              ? unreadChats
              : tab.badge === "notifications"
                ? unreadNotifications
                : 0;

          if (tab.center) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="mobile-tab-center -mt-4 flex flex-col items-center gap-0.5"
                aria-label={tab.label}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={`relative flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg transition-transform active:scale-95 ${
                    active
                      ? "bg-gradient-to-br from-vintage-rust to-vintage-rust-dark text-white"
                      : "bg-vintage-paper text-vintage-rust ring-1 ring-vintage-border"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <UnreadChatBadge count={badgeCount} />
                </span>
                {appearance.showTabLabels && (
                  <span
                    className={`text-[10px] font-semibold ${
                      active ? "text-vintage-rust" : "text-vintage-ink-muted"
                    }`}
                  >
                    {tab.label}
                  </span>
                )}
              </Link>
            );
          }

          const isProfile = tab.label === "You";

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`mobile-tab-item flex min-w-[3rem] flex-1 flex-col items-center gap-0.5 py-1 ${
                active ? "mobile-tab-item-active" : ""
              }`}
              aria-label={tab.label}
              aria-current={active ? "page" : undefined}
            >
              <span className="relative flex h-8 w-8 items-center justify-center">
                {isProfile ? (
                  <span
                    className={`rounded-full ring-2 transition ${
                      active ? "ring-vintage-rust" : "ring-transparent"
                    }`}
                  >
                    <Avatar name={displayName} avatarUrl={avatarUrl} size="sm" />
                  </span>
                ) : (
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                      active ? "mobile-tab-active-pill text-vintage-rust" : "text-vintage-ink-muted"
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                )}
                {badgeCount > 0 && !isProfile && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-vintage-rust px-1 text-[10px] font-bold text-[var(--vintage-btn-text)]">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </span>
              {appearance.showTabLabels && (
                <span
                  className={`text-[10px] font-semibold leading-none ${
                    active ? "text-vintage-rust" : "text-vintage-ink-muted"
                  }`}
                >
                  {tab.label}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
