"use client";

import Link from "next/link";
import {
  Briefcase,
  ImageIcon,
  MessageSquare,
  Pencil,
  Radio,
  Settings2,
  User,
} from "lucide-react";
import {
  getPersonalProfileUrl,
  isBusinessPrimaryAccount,
} from "@/lib/business";
import type { Profile } from "@/lib/types";

const actions = [
  {
    href: "/profile/business/edit",
    label: "Edit storefront",
    description: "Banner, services, contact info",
    icon: Pencil,
  },
  {
    href: "/live/go-live",
    label: "Go live",
    description: "Host a live shopping or Q&A",
    icon: Radio,
  },
  {
    href: "/chat",
    label: "Messages",
    description: "Reply to customer inquiries",
    icon: MessageSquare,
  },
  {
    href: "/profile/business/edit",
    label: "Auto-reply",
    description: "Set welcome messages for DMs",
    icon: Settings2,
  },
] as const;

export function BusinessOwnerPanel({
  profile,
}: {
  profile: Profile;
}) {
  return (
    <section className="vintage-card overflow-hidden">
      <div className="border-b border-vintage-border px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vintage-ink-muted">
          Business dashboard
        </p>
        <h2 className="font-display mt-1 text-lg font-semibold text-vintage-ink">
          Manage {profile.business_name}
        </h2>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className="group flex gap-3 rounded-sm border border-vintage-border p-4 transition hover:border-vintage-rust/40 hover:bg-vintage-paper-dark/50"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-vintage-rust/10 text-vintage-rust">
                <Icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-vintage-ink group-hover:text-vintage-rust">
                  {action.label}
                </span>
                <span className="mt-0.5 block text-xs text-vintage-ink-muted">
                  {action.description}
                </span>
              </span>
            </Link>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-vintage-border px-4 py-3">
        <Link
          href="/profile/business/edit"
          className="vintage-btn-outline inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold"
        >
          <ImageIcon className="h-3.5 w-3.5" />
          {profile.business_cover_url ? "Change banner" : "Add banner"}
        </Link>
        {!isBusinessPrimaryAccount(profile) && (
          <Link
            href={getPersonalProfileUrl(profile.username)}
            className="vintage-btn-outline inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold"
          >
            <User className="h-3.5 w-3.5" />
            Personal profile
          </Link>
        )}
        <span className="inline-flex items-center gap-1.5 px-2 py-2 text-xs text-vintage-ink-muted">
          <Briefcase className="h-3.5 w-3.5" />
          {profile.business_category ?? "Business"}
        </span>
      </div>
    </section>
  );
}
