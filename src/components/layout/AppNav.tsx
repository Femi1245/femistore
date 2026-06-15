"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gamepad2, Home, MessageCircle, Play, Radio, User, Settings } from "lucide-react";
import { Logo } from "@/components/Logo";
import type { Profile } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { NotificationBell } from "@/components/notifications/NotificationBell";

const links = [
  { href: "/feed", label: "Feed", icon: Home },
  { href: "/watch", label: "Watch", icon: Play },
  { href: "/live", label: "Live", icon: Radio },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/games", label: "Games", icon: Gamepad2 },
  { href: null, label: "Profile", icon: User, dynamic: true as const },
  { href: "/profile/edit", label: "Settings", icon: Settings },
];

export function AppNav({ user }: { user: Profile }) {
  const pathname = usePathname();
  const profileHref = `/profile/${user.username}`;

  return (
    <header className="vintage-nav sticky top-0 z-50">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Logo size="sm" />
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const href = link.dynamic ? profileHref : link.href!;
            const active =
              pathname === href ||
              (link.href === "/feed" && pathname.startsWith("/feed")) ||
              (link.href === "/watch" && pathname.startsWith("/watch")) ||
              (link.href === "/live" && pathname.startsWith("/live")) ||
              (link.href === "/games" && pathname.startsWith("/games")) ||
              (link.dynamic &&
                pathname.startsWith("/profile/") &&
                !pathname.endsWith("/edit"));

            const Icon = link.icon;
            return (
              <Link
                key={link.label}
                href={href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold vintage-nav-link ${
                  active ? "vintage-nav-link-active" : ""
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{link.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <NotificationBell userId={user.id} />
          <ThemeToggle />
          <Link href={profileHref}>
            <Avatar
              name={user.display_name}
              avatarUrl={user.avatar_url}
              size="sm"
            />
          </Link>
        </div>
      </div>
    </header>
  );
}
