"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Gamepad2, Play, Radio, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { loadSuggestedProfiles, toggleFollow } from "@/lib/social";
import type { Profile } from "@/lib/types";
import { Avatar } from "@/components/Avatar";

const quickActions = [
  { href: "/live/go-live", label: "Go Live", icon: Radio },
  { href: "/watch", label: "Watch videos", icon: Play },
  { href: "/games", label: "Play games", icon: Gamepad2 },
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
      <div className="sticky top-[7.5rem] space-y-4">
        <div className="vintage-card p-4">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-vintage-ink-muted">
            Quick actions
          </h2>
          <div className="mt-3 space-y-1">
            {quickActions.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-vintage-ink transition hover:bg-vintage-rust/10 hover:text-vintage-rust"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="vintage-card p-4">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-vintage-ink-muted">
            Suggested for you
          </h2>
          <div className="mt-3 space-y-3">
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
              <p className="text-sm text-vintage-ink-muted">
                No suggestions right now.
              </p>
            ) : (
              suggestions.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <Link href={`/profile/${p.username}`}>
                    <Avatar name={p.display_name} avatarUrl={p.avatar_url} size="sm" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/profile/${p.username}`}
                      className="block truncate text-sm font-semibold text-vintage-ink hover:text-vintage-rust"
                    >
                      {p.display_name}
                    </Link>
                    <p className="truncate text-xs text-vintage-ink-muted">
                      @{p.username}
                    </p>
                  </div>
                  <button
                    onClick={() => handleFollow(p.id)}
                    disabled={followed.has(p.id)}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-vintage-rust transition hover:bg-vintage-rust/10 disabled:opacity-50"
                  >
                    {followed.has(p.id) ? (
                      "Following"
                    ) : (
                      <>
                        <UserPlus className="h-3.5 w-3.5" /> Follow
                      </>
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <p className="px-2 text-xs text-vintage-ink-muted/70">
          Zumelia · Connect globally
        </p>
      </div>
    </aside>
  );
}
