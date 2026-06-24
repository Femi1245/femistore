"use client";

import { useCallback, useEffect, useState } from "react";
import { useParticipants } from "@livekit/components-react";
import { Eye, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { heartbeatLiveViewer, loadLiveViewers } from "@/lib/live-stage";
import type { LiveStreamViewer, Profile } from "@/lib/types";
import { Avatar } from "@/components/Avatar";

export function LiveViewersPanel({
  roomName,
  currentUserId,
  hostId,
}: {
  roomName: string;
  currentUserId: string;
  hostId: string;
}) {
  const participants = useParticipants();
  const [viewers, setViewers] = useState<LiveStreamViewer[]>([]);
  const [schemaMissing, setSchemaMissing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await loadLiveViewers(createClient(), roomName);
      setViewers(data);
      setSchemaMissing(false);
    } catch {
      setSchemaMissing(true);
      setViewers([]);
    }
  }, [roomName]);

  useEffect(() => {
    const supabase = createClient();
    void heartbeatLiveViewer(supabase, roomName, currentUserId);
    void refresh();

    const heartbeat = window.setInterval(() => {
      void heartbeatLiveViewer(supabase, roomName, currentUserId);
    }, 30_000);

    const poll = window.setInterval(refresh, 15_000);

    const channel = supabase
      .channel(`live-viewers:${roomName}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_stream_viewers",
          filter: `room_name=eq.${roomName}`,
        },
        () => void refresh(),
      )
      .subscribe();

    return () => {
      window.clearInterval(heartbeat);
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [roomName, currentUserId, refresh]);

  const inRoomCount = participants.filter((p) => !p.isLocal).length + 1;
  const displayCount = Math.max(viewers.length, inRoomCount);

  return (
    <div className="vintage-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-vintage-rust" />
          <h3 className="text-sm font-bold text-vintage-ink">Watching now</h3>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-vintage-rust/10 px-2.5 py-0.5 text-xs font-bold text-vintage-rust">
          <Users className="h-3 w-3" />
          {displayCount}
        </span>
      </div>

      {schemaMissing && (
        <p className="mb-2 text-xs text-vintage-ink-muted">
          Run <code className="text-[10px]">supabase/live-stage-schema.sql</code> for viewer list.
        </p>
      )}

      {viewers.length === 0 ? (
        <p className="text-sm text-vintage-ink-muted">No viewers yet — share your live link.</p>
      ) : (
        <ul className="max-h-48 space-y-2 overflow-y-auto">
          {viewers.map((v) => (
            <ViewerRow
              key={v.user_id}
              profile={v.profile}
              userId={v.user_id}
              hostId={hostId}
              isYou={v.user_id === currentUserId}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ViewerRow({
  profile,
  userId,
  hostId,
  isYou,
}: {
  profile?: Profile;
  userId: string;
  hostId: string;
  isYou: boolean;
}) {
  const name = profile?.display_name ?? "Viewer";
  const isHost = userId === hostId;

  return (
    <li className="flex items-center gap-2 rounded-lg px-1 py-0.5">
      <Avatar name={name} avatarUrl={profile?.avatar_url} size="sm" />
      <span className="min-w-0 flex-1 truncate text-sm text-vintage-ink">
        {name}
        {isYou && <span className="text-vintage-ink-muted"> (you)</span>}
      </span>
      {isHost && (
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-vintage-rust">
          Host
        </span>
      )}
    </li>
  );
}
