"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Headphones, Mic } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { hostDisplayName, loadActiveVoiceRooms } from "@/lib/voice-rooms";
import type { VoiceRoom } from "@/lib/types";
import { Avatar } from "@/components/Avatar";

export function VoiceRoomList() {
  const [rooms, setRooms] = useState<VoiceRoom[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await loadActiveVoiceRooms(createClient());
    setRooms(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 15000);
    return () => window.clearInterval(timer);
  }, [load]);

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="vintage-card h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="vintage-card p-8 text-center">
        <Headphones className="mx-auto h-10 w-10 text-vintage-rust/60" />
        <p className="mt-3 font-display font-semibold text-vintage-ink">No lounges live</p>
        <p className="mt-1 text-sm text-vintage-ink-muted">
          Start one and invite friends to hang out with voice only.
        </p>
        <Link href="/voice/start" className="vintage-btn mt-4 inline-block px-5 py-2.5 text-sm">
          Start a lounge
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rooms.map((room) => (
        <Link
          key={room.id}
          href={`/voice/${encodeURIComponent(room.room_name)}`}
          className="vintage-card flex items-center gap-3 p-4 transition hover:-translate-y-0.5"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-vintage-rust/10 text-vintage-rust">
            <Mic className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display font-bold text-vintage-ink">{room.title}</p>
            {room.topic && (
              <p className="truncate text-xs text-vintage-ink-muted">{room.topic}</p>
            )}
            <div className="mt-1 flex items-center gap-2">
              {room.host && (
                <Avatar
                  name={hostDisplayName(room.host)}
                  avatarUrl={room.host.avatar_url}
                  size="sm"
                />
              )}
              <span className="text-xs text-vintage-ink-muted">
                {hostDisplayName(room.host)}
              </span>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-vintage-olive/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-vintage-olive">
            Live
          </span>
        </Link>
      ))}
    </div>
  );
}
