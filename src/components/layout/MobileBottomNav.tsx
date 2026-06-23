"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, MessageCircle, Play, Radio, User } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { UnreadChatBadge } from "@/components/chat/UnreadChatBadge";
import { useUnreadChatCount } from "@/components/chat/useUnreadChatCount";
import {
  getMobileAppearance,
  MOBILE_APPEARANCE_EVENT,
  type MobileAppearance,
} from "@/lib/mobile-appearance";
import { getDefaultProfileUrl } from "@/lib/business";
import type { Profile } from "@/lib/types";

type Tab = {
  href: string;
  label: string;
  icon: typeof Home;
  match: (p: string) => boolean;
  center?: boolean;
  badge?: "chat";
};

function buildTabs(user: Profile): Tab[] {
  const profileHref = getDefaultProfileUrl(user);
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
      href: "/live",
      label: "Live",
      icon: Radio,
      match: (p) => p.startsWith("/live"),
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
      href: profileHref,
      label: "You",
      icon: User,
      match: (p) =>
        (p.startsWith("/profile/") &&
          !p.endsWith("/edit") &&
          !p.startsWith("/profile/settings") &&
          !p.startsWith("/profile/business")) ||
        p.startsWith("/business/"),
    },
  ];
}

export function MobileBottomNav({ user }: { user: Profile }) {
  const pathname = usePathname();
  const unreadChats = useUnreadChatCount(user.id);
  const [appearance, setAppearance] = useState<MobileAppearance>(() =>
    getMobileAppearance(),
  );

  useEffect(() => {
    const sync = () => setAppearance(getMobileAppearance());
    window.addEventListener(MOBILE_APPEARANCE_EVENT, sync);
    return () => window.removeEventListener(MOBILE_APPEARANCE_EVENT, sync);
  }, []);

  const tabs = buildTabs(user);

  return (
    <nav
      className="mobile-tab-bar fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-lg items-end justify-around px-3 pt-2 pb-1.5">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          const badgeCount = tab.badge === "chat" ? unreadChats : 0;

          if (tab.center) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="mobile-tab-center -mt-5 flex flex-col items-center gap-1"
                aria-label={tab.label}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={`mobile-tab-center-btn relative flex h-12 w-12 items-center justify-center transition-transform active:scale-95 ${
                    active
                      ? "mobile-tab-center-btn-active"
                      : "bg-vintage-paper text-vintage-ink"
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                  <UnreadChatBadge count={badgeCount} />
                </span>
                {appearance.showTabLabels && (
                  <span
                    className={`mobile-tab-label ${
                      active ? "text-vintage-ink" : "text-vintage-ink-muted"
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
              className={`mobile-tab-item flex min-w-[3rem] flex-1 flex-col items-center gap-1 py-1 ${
                active ? "mobile-tab-item-active" : ""
              }`}
              aria-label={tab.label}
              aria-current={active ? "page" : undefined}
            >
              <span className="relative flex h-8 w-8 items-center justify-center">
                {isProfile ? (
                  <span
                    className={`rounded-full ring-1 transition ${
                      active ? "ring-vintage-rust" : "ring-vintage-border"
                    }`}
                  >
                    <Avatar name={user.display_name} avatarUrl={user.avatar_url} size="sm" />
                  </span>
                ) : (
                  <span
                    className={`mobile-tab-active-pill flex h-8 w-8 items-center justify-center transition ${
                      active ? "text-vintage-rust" : "text-vintage-ink-muted"
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2 : 1.5} />
                  </span>
                )}
                {badgeCount > 0 && !isProfile && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-vintage-ink px-1 text-[10px] font-bold text-vintage-cream">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </span>
              {appearance.showTabLabels && (
                <span
                  className={`mobile-tab-label ${
                    active ? "text-vintage-ink" : "text-vintage-ink-muted"
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
