"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Gamepad2, Home, MessageCircle, Play, Radio } from "lucide-react";
const tabs = [
  { href: "/feed", label: "Feed", icon: Home, match: (p: string) => p === "/feed" || p.startsWith("/profile/") },
  { href: "/watch", label: "Watch", icon: Play, match: (p: string) => p.startsWith("/watch") },
  { href: "/live", label: "Live", icon: Radio, match: (p: string) => p.startsWith("/live") },
  { href: "/games", label: "Games", icon: Gamepad2, match: (p: string) => p.startsWith("/games") },
  { href: "/chat", label: "Chat", icon: MessageCircle, match: (p: string) => p === "/chat" },
  { href: "/notifications", label: "Alerts", icon: Bell, match: (p: string) => p.startsWith("/notifications") },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="vintage-nav fixed bottom-0 left-0 right-0 z-50 border-b-0 border-t-[3px] md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Main navigation"
    >
      <div className="mx-auto flex h-14 max-w-5xl items-stretch justify-around px-1">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold vintage-nav-link ${
                active ? "vintage-nav-link-active" : ""
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
