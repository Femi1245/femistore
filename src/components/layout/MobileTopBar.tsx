"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { Logo } from "@/components/Logo";
import { MessageBell } from "@/components/chat/MessageBell";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { AccountModeSwitcher } from "@/components/business/AccountModeSwitcher";
import { getDefaultProfileUrl, hasBusinessProfile } from "@/lib/business";
import type { Profile } from "@/lib/types";

export function MobileTopBar({ user }: { user: Profile }) {
  return (
    <header className="mobile-top-bar vintage-nav sticky top-0 z-50 border-b border-vintage-border-strong/60 md:hidden">
      <div className="flex h-14 items-center justify-between gap-2 px-4">
        <Logo size="sm" showWordmark />
        <div className="flex items-center gap-1">
          {hasBusinessProfile(user) && (
            <AccountModeSwitcher user={user} compact />
          )}
          <MessageBell userId={user.id} />
          <NotificationBell userId={user.id} />
          <ThemeToggle />
          <Link
            href="/profile/settings"
            className="nav-icon-btn"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="h-[18px] w-[18px]" />
          </Link>
        </div>
      </div>
    </header>
  );
}
