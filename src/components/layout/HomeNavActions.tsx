"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useAuthSession } from "@/hooks/use-auth-session";

export function HomeNavActions() {
  const { loggedIn: isLoggedIn } = useAuthSession();

  return (
    <div className="flex items-center gap-3">
      <ThemeToggle />
      {isLoggedIn ? (
        <>
          <Link href="/feed" className="vintage-btn px-5 py-2.5 text-sm">
            Open Feed
          </Link>
          <Link href="/chat" className="vintage-btn-outline px-5 py-2.5 text-sm">
            Messages
          </Link>
        </>
      ) : (
        <>
          <Link
            href="/login"
            className="px-4 py-2.5 text-sm font-semibold text-vintage-ink-muted hover:text-vintage-ink"
          >
            Sign in
          </Link>
          <Link href="/signup" className="vintage-btn px-5 py-2.5 text-sm">
            Join free
          </Link>
        </>
      )}
    </div>
  );
}
