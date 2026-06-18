"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gamepad2, Home, Play, Radio, User, Settings, Briefcase } from "lucide-react";
import { Logo } from "@/components/Logo";
import type { Profile } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { AccountModeSwitcher } from "@/components/business/AccountModeSwitcher";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { MessageBell } from "@/components/chat/MessageBell";
import { MobileTopBar } from "@/components/layout/MobileTopBar";

const links = [
  { href: "/feed", label: "Feed", icon: Home },
  { href: "/watch", label: "Watch", icon: Play },
  { href: "/live", label: "Live", icon: Radio },
  { href: "/discover/businesses", label: "Businesses", icon: Briefcase },
  { href: "/games", label: "Games", icon: Gamepad2 },
  { href: null, label: "Profile", icon: User, dynamic: true as const },
  { href: "/profile/settings", label: "Settings", icon: Settings },
];

function isLinkActive(
  pathname: string,
  link: (typeof links)[number],
  href: string,
): boolean {
  if (pathname === href) return true;
  if (link.href === "/feed" && (pathname.startsWith("/feed") || pathname === "/")) {
    return true;
  }
  if (link.href === "/watch" && pathname.startsWith("/watch")) return true;
  if (link.href === "/live" && pathname.startsWith("/live")) return true;
  if (link.href === "/games" && pathname.startsWith("/games")) return true;
  if (link.href === "/discover/businesses" && pathname.startsWith("/discover")) return true;
  if (link.href === "/profile/settings" && pathname.startsWith("/profile/settings")) {
    return true;
  }
  if (
    link.dynamic &&
    pathname.startsWith("/profile/") &&
    !pathname.endsWith("/edit") &&
    !pathname.startsWith("/profile/settings") &&
    !pathname.startsWith("/profile/business")
  ) {
    return true;
  }
  return false;
}

export function AppNav({ user }: { user: Profile }) {
  const pathname = usePathname();
  const profileHref = `/profile/${user.username}`;

  return (
    <>
      <MobileTopBar user={user} />
      <header className="vintage-nav sticky top-0 z-50 hidden md:block">
      <div className="mx-auto grid h-14 max-w-6xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 sm:gap-3 sm:px-4 lg:gap-4">
        <div className="relative z-10 shrink-0">
          <Logo size="sm" compact />
        </div>

        <nav
          className="hidden min-w-0 items-center justify-center gap-0.5 overflow-x-auto md:flex lg:gap-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Main"
        >
          {links.map((link) => {
            const href = link.dynamic ? profileHref : link.href!;
            const active = isLinkActive(pathname, link, href);
            const Icon = link.icon;

            return (
              <Link
                key={link.label}
                href={href}
                title={link.label}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold vintage-nav-link lg:px-2.5 lg:py-2 lg:text-sm ${
                  active ? "vintage-nav-link-active" : ""
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden xl:inline">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-1.5">
          <div className="hidden lg:block">
            <AccountModeSwitcher user={user} />
          </div>
          <MessageBell userId={user.id} />
          <NotificationBell userId={user.id} />
          <ThemeToggle />
          <Link
            href={profileHref}
            className="ml-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg vintage-nav-link hover:bg-vintage-paper-dark"
            title="Your profile"
          >
            <Avatar
              name={user.display_name}
              avatarUrl={user.avatar_url}
              size="sm"
            />
          </Link>
        </div>
      </div>
    </header>
    </>
  );
}
