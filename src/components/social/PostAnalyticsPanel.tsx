"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Eye,
  Heart,
  Loader2,
  MessageCircle,
  Repeat2,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getPersonalProfileUrl } from "@/lib/business";
import { loadPostAnalytics } from "@/lib/post-analytics";
import type { PostAnalytics } from "@/lib/types";
import { Avatar } from "@/components/Avatar";

function formatViewDay(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

function formatViewedAt(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export function PostAnalyticsPanel({
  postId,
  ownerId,
  compact = false,
}: {
  postId: string;
  ownerId: string;
  /** Inline under a post card (no outer card chrome). */
  compact?: boolean;
}) {
  const [data, setData] = useState<PostAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const analytics = await loadPostAnalytics(
          createClient(),
          postId,
          ownerId,
        );
        if (!cancelled) {
          setData(analytics);
          if (!analytics) setError("Analytics are only available on your posts.");
        }
      } catch {
        if (!cancelled) setError("Could not load analytics.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [postId, ownerId]);

  const maxDayViews = useMemo(
    () => Math.max(1, ...(data?.viewsByDay.map((d) => d.views) ?? [1])),
    [data],
  );

  const shell = compact
    ? "overflow-hidden rounded-lg border border-vintage-border/80 bg-vintage-paper-dark/40"
    : "vintage-card overflow-hidden";

  if (loading) {
    return (
      <div
        className={`${shell} flex items-center justify-center gap-2 px-4 py-8 text-sm text-vintage-ink-muted`}
      >
        <Loader2 className="h-4 w-4 animate-spin text-vintage-rust" />
        Loading analytics…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`${shell} px-4 py-5 text-center text-sm text-vintage-ink-muted`}>
        {error ?? "No analytics available."}
      </div>
    );
  }

  if (data.schemaMissing) {
    return (
      <div className={`${shell} px-4 py-5 text-sm text-vintage-ink-muted`}>
        Post views are not set up yet. Run{" "}
        <code className="text-xs">supabase/post-analytics-schema.sql</code> in
        the Supabase SQL Editor, then refresh.
      </div>
    );
  }

  const stats = [
    { label: "Views", value: data.views, icon: Eye },
    { label: "Likes", value: data.likes, icon: Heart },
    { label: "Comments", value: data.comments, icon: MessageCircle },
    { label: "Reshares", value: data.reshares, icon: Repeat2 },
  ];

  return (
    <section className={shell}>
      {!compact && (
        <div className="flex items-center gap-2 border-b border-vintage-border px-4 py-3">
          <BarChart3 className="h-4 w-4 text-vintage-rust" />
          <h2 className="font-display text-sm font-bold text-vintage-ink">
            Post analytics
          </h2>
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-vintage-ink-muted">
            Only you can see this
          </span>
        </div>
      )}

      {compact && (
        <div className="flex items-center gap-2 border-b border-vintage-border/70 px-3 py-2">
          <BarChart3 className="h-3.5 w-3.5 text-vintage-rust" />
          <p className="text-xs font-semibold text-vintage-ink">Your analytics</p>
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-vintage-ink-muted">
            Only you
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-px bg-vintage-border sm:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className={`bg-vintage-paper text-center ${compact ? "px-2 py-3" : "px-3 py-4"}`}
          >
            <Icon className="mx-auto mb-1 h-3.5 w-3.5 text-vintage-rust" />
            <p
              className={`font-display font-bold tabular-nums text-vintage-ink ${
                compact ? "text-lg" : "text-xl"
              }`}
            >
              {value}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-vintage-ink-muted">
              {label}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-vintage-border px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex items-center gap-2 text-sm text-vintage-ink">
          <TrendingUp className="h-4 w-4 text-vintage-olive" />
          <span className="font-semibold">Engagement rate</span>
        </div>
        <p className="font-display text-base font-bold tabular-nums text-vintage-ink sm:text-lg">
          {data.views === 0 ? "—" : `${data.engagementRate}%`}
        </p>
      </div>

      <div className="border-t border-vintage-border px-3 py-3 sm:px-4 sm:py-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-vintage-ink-muted sm:mb-3 sm:text-xs">
          Views · last 7 days
        </p>
        <div className={`flex items-end gap-1.5 ${compact ? "h-16" : "h-24"}`}>
          {data.viewsByDay.map((day) => (
            <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
              {!compact && (
                <span className="text-[10px] tabular-nums text-vintage-ink-muted">
                  {day.views || ""}
                </span>
              )}
              <div
                className="w-full rounded-sm bg-vintage-rust/80"
                style={{
                  height: `${Math.max(4, (day.views / maxDayViews) * 100)}%`,
                  minHeight: day.views > 0 ? 8 : 4,
                  opacity: day.views > 0 ? 1 : 0.25,
                }}
                title={`${day.date}: ${day.views}`}
              />
              <span className="text-[9px] text-vintage-ink-muted">
                {formatViewDay(day.date)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-vintage-border px-3 py-3 sm:px-4 sm:py-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-vintage-ink-muted sm:mb-3 sm:text-xs">
          Recent viewers
        </p>
        {data.recentViewers.length === 0 ? (
          <p className="text-sm text-vintage-ink-muted">
            No views yet — share your post to start collecting insights.
          </p>
        ) : (
          <ul className="space-y-2">
            {(compact ? data.recentViewers.slice(0, 5) : data.recentViewers).map(
              (v) => {
                const name = v.profile?.display_name ?? "Viewer";
                const href = v.profile?.username
                  ? getPersonalProfileUrl(v.profile.username)
                  : null;
                return (
                  <li
                    key={`${v.viewerId}-${v.viewedAt}`}
                    className="flex items-center gap-2.5"
                  >
                    {href ? (
                      <Link href={href} className="shrink-0">
                        <Avatar
                          name={name}
                          avatarUrl={v.profile?.avatar_url}
                          size="sm"
                        />
                      </Link>
                    ) : (
                      <Avatar
                        name={name}
                        avatarUrl={v.profile?.avatar_url}
                        size="sm"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      {href ? (
                        <Link
                          href={href}
                          className="block truncate text-sm font-semibold text-vintage-ink hover:text-vintage-rust"
                        >
                          {name}
                        </Link>
                      ) : (
                        <p className="truncate text-sm font-semibold text-vintage-ink">
                          {name}
                        </p>
                      )}
                      <p className="text-[11px] text-vintage-ink-muted">
                        {formatViewedAt(v.viewedAt)}
                      </p>
                    </div>
                  </li>
                );
              },
            )}
          </ul>
        )}
      </div>
    </section>
  );
}
