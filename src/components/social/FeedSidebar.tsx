"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Gamepad2, Play, Radio, UserPlus, Briefcase, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { loadSuggestedProfiles, toggleFollow } from "@/lib/social";
import type { Profile } from "@/lib/types";
import { Avatar } from "@/components/Avatar";

const discoverLinks = [
  { href: "/opportunities", label: "Marketplace & gigs", icon: Sparkles, desc: "Services & opportunities" },
  { href: "/live?tab=voice", label: "Voice lounges", icon: Radio, desc: "Audio hangouts" },
  { href: "/live/go-live", label: "Go live", icon: Radio, desc: "Video with AR effects" },
  { href: "/discover/businesses", label: "Businesses", icon: Briefcase, desc: "Curated storefronts" },
  { href: "/watch", label: "Watch", icon: Play, desc: "Long-form video" },
  { href: "/games", label: "Play", icon: Gamepad2, desc: "Games with friends" },
];

export function FeedSidebar({ currentUser }: { currentUser: Profile }) {
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSuggestedProfiles(createClient(), currentUser.id, 4)
      .then(setSuggestions)
      .finally(() => setLoading(false));
  }, [currentUser.id]);

  async function handleFollow(id: string) {
    setFollowed((prev) => new Set(prev).add(id));
    await toggleFollow(createClient(), currentUser.id, id);
  }

  return (
    <aside className="hidden w-72 shrink-0 lg:block">
      <div className="sticky top-[7.5rem] space-y-5">
        <div className="vintage-card editorial-sidebar-card">
          <p className="editorial-eyebrow mb-1">Discover</p>
          <h2 className="editorial-sidebar-title">Beyond the feed</h2>
          <div className="mt-4 space-y-0.5">
            {discoverLinks.map(({ href, label, icon: Icon, desc }) => (
              <Link
                key={href}
                href={href}
                className="flex items-start gap-3 rounded-lg px-2 py-2.5 transition hover:bg-vintage-rust/8"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-vintage-rust/10 text-vintage-rust">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-vintage-ink">{label}</span>
                  <span className="block text-xs text-vintage-ink-muted">{desc}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="vintage-card editorial-sidebar-card p-4 pl-5">
          <p className="editorial-eyebrow mb-1">People</p>
          <h2 className="editorial-sidebar-title">Worth knowing</h2>
          <div className="mt-4 space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="skeleton skeleton-circle h-9 w-9" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton h-2.5 w-24" />
                    <div className="skeleton h-2 w-16" />
                  </div>
                </div>
              ))
            ) : suggestions.length === 0 ? (
              <p className="text-sm text-vintage-ink-muted">No suggestions right now.</p>
            ) : (
              suggestions.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <Link href={`/profile/${p.username}`}>
                    <Avatar name={p.display_name} avatarUrl={p.avatar_url} size="sm" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/profile/${p.username}`}
                      className="block truncate font-display text-sm font-semibold text-vintage-ink hover:text-vintage-rust"
                    >
                      {p.display_name}
                    </Link>
                    <p className="truncate text-xs text-vintage-ink-muted">@{p.username}</p>
                  </div>
                  <button
                    onClick={() => handleFollow(p.id)}
                    disabled={followed.has(p.id)}
                    className="rounded-full border border-vintage-border px-2.5 py-1 text-xs font-semibold text-vintage-rust transition hover:border-vintage-rust/50 hover:bg-vintage-rust/10 disabled:opacity-50"
                  >
                    {followed.has(p.id) ? "Following" : (
                      <span className="inline-flex items-center gap-1">
                        <UserPlus className="h-3 w-3" /> Follow
                      </span>
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <p className="px-2 font-display text-sm text-vintage-ink-muted">
          Zumelia — connection, crafted.
        </p>
      </div>
    </aside>
  );
}
