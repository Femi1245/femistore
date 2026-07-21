"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Radio } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { LiveStream, Profile } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { PostCardSkeleton } from "@/components/skeletons/PostCardSkeleton";
import {
  getLiveCategory,
  type LiveCategory,
} from "@/lib/live-categories";

export function LiveStreamList({
  category,
}: {
  category: LiveCategory | "all";
}) {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let query = supabase
      .from("live_streams")
      .select("*")
      .eq("is_live", true)
      .order("started_at", { ascending: false });

    if (category !== "all") {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error?.code === "PGRST205") {
      setStreams([]);
      setLoading(false);
      return;
    }

    const rows = (data as LiveStream[]) ?? [];
    if (!rows.length) {
      setStreams([]);
      setLoading(false);
      return;
    }

    const hostIds = [...new Set(rows.map((s) => s.host_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("id", hostIds);

    const map = new Map((profiles as Profile[])?.map((p) => [p.id, p]));
    setStreams(rows.map((s) => ({ ...s, host: map.get(s.host_id) })));
    setLoading(false);
  }, [category]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-4">
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    );
  }

  if (streams.length === 0) {
    return (
      <div className="vintage-card py-12 text-center">
        <Radio className="mx-auto h-10 w-10 text-vintage-border" />
        <p className="mt-3 text-vintage-ink-muted">
          {category === "all"
            ? "No one is live right now."
            : `No ${getLiveCategory(category).label.toLowerCase()} streams are live right now.`}
        </p>
        <Link href="/live/go-live" className="vintage-btn mt-4 inline-block px-6 py-2">
          Be the first to go live
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {streams.map((stream) => (
        <Link
          key={stream.id}
          href={`/live/${stream.room_name}`}
          className="vintage-card block p-4 transition hover:translate-x-[-1px] hover:translate-y-[-1px]"
        >
          <div className="mb-3 flex items-center gap-3">
            {stream.host && (
              <Avatar
                name={stream.host.display_name}
                avatarUrl={stream.host.avatar_url}
              />
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold text-vintage-ink">{stream.title}</p>
              <p className="truncate text-xs text-vintage-ink-muted">
                {stream.host?.display_name ?? "Host"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-sm bg-vintage-rust px-2 py-0.5 text-xs font-bold text-[var(--vintage-btn-text)]">
              <Radio className="h-3 w-3 animate-pulse" />
              LIVE
            </span>
            {(() => {
              const categoryInfo = getLiveCategory(stream.category ?? "video");
              const CategoryIcon = categoryInfo.icon;
              return (
                <span className="inline-flex items-center gap-1 rounded-full border border-vintage-border px-2 py-0.5 text-xs font-medium text-vintage-ink-muted">
                  <CategoryIcon className="h-3 w-3" />
                  {categoryInfo.label}
                </span>
              );
            })()}
          </div>
        </Link>
      ))}
    </div>
  );
}
