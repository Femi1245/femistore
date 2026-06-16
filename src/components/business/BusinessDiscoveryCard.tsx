"use client";

import Link from "next/link";
import { Briefcase, Globe, MapPin } from "lucide-react";
import type { Profile } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { getPublicDisplayName } from "@/lib/business";

export function BusinessDiscoveryCard({ profile }: { profile: Profile }) {
  const name = profile.business_name ?? getPublicDisplayName(profile);

  return (
    <Link
      href={`/profile/${profile.username}`}
      className="vintage-card group block overflow-hidden transition hover:ring-2 hover:ring-vintage-rust/30"
    >
      {profile.business_cover_url ? (
        <div
          className="h-28 bg-cover bg-center"
          style={{ backgroundImage: `url(${profile.business_cover_url})` }}
        />
      ) : (
        <div className="flex h-28 items-center justify-center bg-vintage-rust/10">
          <Briefcase className="h-10 w-10 text-vintage-rust/40" />
        </div>
      )}
      <div className="p-4">
        <div className="mb-3 flex items-start gap-3">
          <Avatar
            name={name}
            avatarUrl={profile.avatar_url}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-vintage-ink group-hover:text-vintage-rust">
              {name}
            </p>
            <p className="truncate text-xs text-vintage-ink-muted">@{profile.username}</p>
          </div>
        </div>
        {profile.business_category && (
          <span className="mb-2 inline-block rounded-full vintage-card-inset px-2.5 py-0.5 text-[11px] font-semibold text-vintage-ink-muted">
            {profile.business_category}
          </span>
        )}
        {profile.business_tagline && (
          <p className="line-clamp-2 text-sm font-medium text-vintage-rust">
            {profile.business_tagline}
          </p>
        )}
        {profile.business_description && (
          <p className="mt-2 line-clamp-3 text-sm text-vintage-ink-muted">
            {profile.business_description}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-vintage-ink-muted">
          {profile.business_location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {profile.business_location}
            </span>
          )}
          {profile.business_website && (
            <span className="inline-flex items-center gap-1">
              <Globe className="h-3.5 w-3.5" /> Website
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
