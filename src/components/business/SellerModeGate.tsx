"use client";

import Link from "next/link";
import { Briefcase, Store } from "lucide-react";
import {
  canCreateServiceGigs,
  getBusinessProfileUrl,
  hasBusinessProfile,
} from "@/lib/business";
import type { Profile } from "@/lib/types";
import { AccountModeSwitcher } from "@/components/business/AccountModeSwitcher";

export function SellerModeGate({
  user,
  children,
}: {
  user: Profile;
  children: React.ReactNode;
}) {
  if (canCreateServiceGigs(user)) {
    return <>{children}</>;
  }

  if (!hasBusinessProfile(user)) {
    return (
      <div className="vintage-card space-y-4 p-6 text-center sm:p-8">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-sm bg-vintage-rust/10 text-vintage-rust">
          <Store className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-xl font-bold text-vintage-ink">
            Set up your business storefront
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-vintage-ink-muted">
            To list products and services as a seller, create your business profile first.
          </p>
        </div>
        <Link
          href="/profile/business/setup"
          className="vintage-btn inline-flex items-center gap-2 px-6 py-2.5 text-sm"
        >
          <Briefcase className="h-4 w-4" />
          Set up business profile
        </Link>
      </div>
    );
  }

  return (
    <div className="vintage-card space-y-5 p-6 sm:p-8">
      <div className="text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-sm bg-vintage-rust/10 text-vintage-rust">
          <Briefcase className="h-6 w-6" />
        </span>
        <h1 className="font-display mt-4 text-xl font-bold text-vintage-ink">
          Switch to business mode
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-vintage-ink-muted">
          List gigs and manage services from your storefront. Switch to business mode as a
          seller, then create your listing.
        </p>
      </div>
      <div className="flex flex-col items-center gap-4">
        <AccountModeSwitcher user={user} />
        <Link
          href={getBusinessProfileUrl(user.username)}
          className="vintage-btn-outline inline-flex items-center gap-2 px-5 py-2.5 text-sm"
        >
          <Store className="h-4 w-4" />
          Open my storefront
        </Link>
      </div>
    </div>
  );
}

/** Inline prompt for store sections when owner is not in seller mode. */
export function SellerModePrompt({ user }: { user: Profile }) {
  if (canCreateServiceGigs(user)) return null;

  if (!hasBusinessProfile(user)) {
    return (
      <div className="vintage-card border-vintage-mustard/30 bg-vintage-mustard/10 p-4 text-sm">
        <p className="font-semibold text-vintage-ink">Sell on Zumelia</p>
        <p className="mt-1 text-vintage-ink-muted">
          Set up your business profile to list products and services.
        </p>
        <Link
          href="/profile/business/setup"
          className="mt-3 inline-flex items-center gap-1 font-semibold text-vintage-rust hover:underline"
        >
          <Briefcase className="h-4 w-4" />
          Set up business profile
        </Link>
      </div>
    );
  }

  return (
    <div className="vintage-card border-vintage-rust/25 bg-vintage-rust/5 p-4">
      <p className="text-sm font-semibold text-vintage-ink">Switch to business mode to sell</p>
      <p className="mt-1 text-sm text-vintage-ink-muted">
        You&apos;re viewing as personal. Switch to business mode to list and manage service gigs.
      </p>
      <div className="mt-3">
        <AccountModeSwitcher user={user} />
      </div>
    </div>
  );
}
