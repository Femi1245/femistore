"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Briefcase, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  canSwitchAccountMode,
  getActiveMode,
  getBusinessProfileUrl,
  getPersonalProfileUrl,
  switchAccountMode,
} from "@/lib/business";
import type { Profile } from "@/lib/types";

export function AccountModeSwitcher({
  user,
  className = "",
  compact = false,
}: {
  user: Profile;
  className?: string;
  /** Icon-only toggle for tight headers (desktop nav). */
  compact?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  if (!canSwitchAccountMode(user)) return null;

  const mode = getActiveMode(user);
  const isBusiness = mode === "business";

  async function goTo(mode: "personal" | "business") {
    if (getActiveMode(user) !== mode) {
      await switchAccountMode(createClient(), user.id, mode);
    }
    const dest =
      mode === "business"
        ? getBusinessProfileUrl(user.username)
        : getPersonalProfileUrl(user.username);
    if (pathname !== dest) {
      router.push(dest);
    } else {
      router.refresh();
    }
  }

  const btnPad = compact ? "px-1.5 py-1" : "px-2.5 py-1.5";

  return (
    <div
      className={`flex items-center gap-0.5 rounded-lg border border-vintage-border bg-vintage-paper-dark/50 p-0.5 ${className}`}
      role="tablist"
      aria-label="Account mode"
    >
      <button
        type="button"
        role="tab"
        aria-selected={!isBusiness}
        title="Personal account"
        onClick={() => goTo("personal")}
        className={`flex items-center gap-1 rounded-md ${btnPad} text-xs font-semibold uppercase tracking-wide transition ${
          !isBusiness
            ? "bg-vintage-paper text-vintage-ink shadow-sm"
            : "text-vintage-ink-muted hover:text-vintage-ink"
        }`}
      >
        <User className="h-3.5 w-3.5 shrink-0" />
        {!compact && <span>Personal</span>}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={isBusiness}
        title="Business account"
        onClick={() => goTo("business")}
        className={`flex items-center gap-1 rounded-md ${btnPad} text-xs font-semibold uppercase tracking-wide transition ${
          isBusiness
            ? "bg-vintage-paper text-vintage-rust shadow-sm"
            : "text-vintage-ink-muted hover:text-vintage-ink"
        }`}
      >
        <Briefcase className="h-3.5 w-3.5 shrink-0" />
        {!compact && <span>Business</span>}
      </button>
    </div>
  );
}

/** Compact link when only one mode is available (should not happen with canSwitch). */
export function AccountModeSwitcherLink({ user }: { user: Profile }) {
  if (!canSwitchAccountMode(user)) return null;
  const mode = getActiveMode(user);
  const href =
    mode === "business"
      ? getBusinessProfileUrl(user.username)
      : getPersonalProfileUrl(user.username);
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-xs font-semibold text-vintage-rust"
    >
      <Briefcase className="h-3.5 w-3.5" />
      {mode === "business" ? "Business" : "Personal"}
    </Link>
  );
}
