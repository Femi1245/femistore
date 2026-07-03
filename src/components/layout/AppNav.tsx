"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gamepad2,
  Home,
  MoreHorizontal,
  Play,
  Radio,
  User,
  Settings,
  Briefcase,
  Sparkles,
  Shield,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import {
  hasBusinessProfile,
  getBusinessProfileUrl,
  getDefaultProfileUrl,
  getPersonalProfileUrl,
} from "@/lib/business";
import type { Profile } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { AccountModeSwitcher } from "@/components/business/AccountModeSwitcher";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { NotificationPushListener } from "@/components/notifications/NotificationPushListener";
import { MessageBell } from "@/components/chat/MessageBell";
import { MobileTopBar } from "@/components/layout/MobileTopBar";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
};

const primaryLinks: NavItem[] = [
  { href: "/feed", label: "Feed", icon: Home },
  { href: "/watch", label: "Watch", icon: Play },
  { href: "/live", label: "Live", icon: Radio },
  { href: "/games", label: "Games", icon: Gamepad2 },
];

function isLinkActive(pathname: string, href: string, label: string): boolean {
  if (pathname === href) return true;
  if (href === "/feed" && (pathname.startsWith("/feed") || pathname === "/")) {
    return true;
  }
  if (href === "/watch" && pathname.startsWith("/watch")) return true;
  if (href === "/live" && (pathname.startsWith("/live") || pathname.startsWith("/voice"))) {
    return true;
  }
  if (href === "/games" && pathname.startsWith("/games")) return true;
  if (href === "/discover/businesses" && pathname.startsWith("/discover")) return true;
  if (href === "/opportunities" && pathname.startsWith("/opportunities")) return true;
  if (href === "/profile/settings" && pathname.startsWith("/profile/settings")) {
    return true;
  }
  if (href === "/admin" && pathname.startsWith("/admin")) {
    return true;
  }
  if (label === "Profile" && pathname.startsWith("/profile/")) {
    return (
      !pathname.endsWith("/edit") &&
      !pathname.startsWith("/profile/settings") &&
      !pathname.startsWith("/profile/business")
    );
  }
  if (href.startsWith("/business/") && pathname.startsWith("/business/")) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  return false;
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: NavItem & { active: boolean }) {
  return (
    <Link
      href={href}
      title={label}
      className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold vintage-nav-link lg:px-2.5 lg:py-2 lg:text-sm ${
        active ? "vintage-nav-link-active" : ""
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="hidden 2xl:inline">{label}</span>
    </Link>
  );
}

function NavMoreMenu({
  items,
  pathname,
}: {
  items: NavItem[];
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const anyActive = items.some((item) => isLinkActive(pathname, item.href, item.label));

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="More"
        aria-label="More navigation"
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold vintage-nav-link lg:px-2.5 lg:py-2 lg:text-sm ${
          anyActive ? "vintage-nav-link-active" : ""
        }`}
      >
        <MoreHorizontal className="h-4 w-4 shrink-0" />
        <span className="hidden 2xl:inline">More</span>
      </button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          />
          <div className="absolute left-1/2 z-40 mt-1 w-44 -translate-x-1/2 vintage-card py-1 shadow-lg lg:left-0 lg:translate-x-0">
            {items.map((item) => {
              const Icon = item.icon;
              const active = isLinkActive(pathname, item.href, item.label);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm hover:bg-vintage-paper-dark ${
                    active ? "text-vintage-rust font-semibold" : "text-vintage-ink"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function AppNav({ user }: { user: Profile }) {
  const pathname = usePathname();
  const { isAdmin } = usePlatformAdmin();
  const profileHref = getDefaultProfileUrl(user);
  const personalHref = getPersonalProfileUrl(user.username);
  const businessHref = hasBusinessProfile(user)
    ? getBusinessProfileUrl(user.username)
    : "/profile/business/setup";

  const moreLinks: NavItem[] = [
    ...(hasBusinessProfile(user)
      ? [{ href: businessHref, label: "My store", icon: Briefcase }]
      : []),
    { href: "/opportunities", label: "Marketplace", icon: Sparkles },
    { href: "/discover/businesses", label: "Businesses", icon: Briefcase },
    { href: personalHref, label: "Profile", icon: User },
  ];

  return (
    <>
      <NotificationPushListener userId={user.id} />
      <MobileTopBar user={user} />
      <header className="vintage-nav sticky top-0 z-50 hidden md:block">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 lg:gap-4 lg:px-6">
          <div className="shrink-0">
            <Logo size="sm" showWordmark />
          </div>

          <nav
            className="flex min-w-0 flex-1 items-center justify-center gap-0.5 lg:gap-1"
            aria-label="Main"
          >
            {primaryLinks.map((link) => (
              <NavLink
                key={link.label}
                {...link}
                active={isLinkActive(pathname, link.href, link.label)}
              />
            ))}
            <NavMoreMenu items={moreLinks} pathname={pathname} />
          </nav>

          <div className="flex shrink-0 items-center gap-1 border-l border-vintage-border pl-2 lg:gap-1.5 lg:pl-3">
            {hasBusinessProfile(user) && (
              <AccountModeSwitcher user={user} compact />
            )}
            <MessageBell userId={user.id} />
            <NotificationBell userId={user.id} />
            <ThemeToggle />
            {isAdmin && (
              <Link
                href="/admin"
                className={`nav-icon-btn ${
                  pathname.startsWith("/admin") ? "nav-icon-btn-active" : ""
                }`}
                title="Admin dashboard"
                aria-label="Admin dashboard"
              >
                <Shield className="h-[18px] w-[18px]" />
              </Link>
            )}
            <Link
              href="/profile/settings"
              className={`nav-icon-btn ${
                pathname.startsWith("/profile/settings") ? "nav-icon-btn-active" : ""
              }`}
              title="Settings"
              aria-label="Settings"
            >
              <Settings className="h-[18px] w-[18px]" />
            </Link>
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
