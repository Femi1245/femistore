"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useRoomContext,
  VideoConference,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Loader2, Mic, PhoneOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CallSession, CallType } from "@/lib/types";

function CallSessionWatcher({
  sessionId,
  onRemoteEnd,
}: {
  sessionId: string;
  onRemoteEnd: () => void;
}) {
  const room = useRoomContext();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`call-overlay:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "call_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const session = payload.new as CallSession;
          if (!["ringing", "active"].includes(session.status)) {
            void room.disconnect(true);
            onRemoteEnd();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onRemoteEnd, room, sessionId]);

  return null;
}

export function CallOverlay({
  sessionId,
  callType,
  title,
  onEnd,
}: {
  sessionId: string;
  callType: CallType;
  title: string;
  onEnd: () => void;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const endedRef = useRef(false);

  const finishCall = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    onEnd();
  }, [onEnd]);

  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/calls/token?sessionId=${encodeURIComponent(sessionId)}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not join call");
      setLoading(false);
      return;
    }
    setToken(data.token);
    setServerUrl(data.serverUrl);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    connect();
  }, [connect]);

  async function hangUp() {
    await fetch("/api/calls/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    finishCall();
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 text-white">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="mt-4">Connecting call…</p>
      </div>
    );
  }

  if (error || !token || !serverUrl) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 p-6 text-white">
        <p className="text-center text-red-300">{error ?? "Connection failed"}</p>
        <button type="button" onClick={finishCall} className="vintage-btn mt-4 px-6 py-2">
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 text-white">
      <div className="flex items-center justify-between border-b border-white/20 px-4 py-3">
        <div>
          <p className="text-sm text-white/70">
            {callType === "video" ? "Video call" : "Voice call"}
          </p>
          <p className="font-semibold">{title}</p>
        </div>
        <button
          type="button"
          onClick={hangUp}
          className="flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-700"
        >
          <PhoneOff className="h-4 w-4" /> End
        </button>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden p-4">
        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          connect
          video={callType === "video"}
          audio
          onDisconnected={finishCall}
          className="flex flex-1 flex-col"
        >
          <CallSessionWatcher sessionId={sessionId} onRemoteEnd={finishCall} />
          <RoomAudioRenderer />
          {callType === "video" ? (
            <div className="flex-1 overflow-hidden rounded-lg [&_.lk-video-conference]:min-h-[50vh]">
              <VideoConference />
            </div>
          ) : (
            <AudioCallStage onEnd={hangUp} />
          )}
        </LiveKitRoom>
      </div>
    </div>
  );
}

function AudioCallStage({ onEnd }: { onEnd: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-vintage-rust/30">
        <Mic className="h-10 w-10" />
      </div>
      <p className="text-lg">Voice call in progress</p>
      <p className="text-sm text-white/60">Speak freely — everyone in the call can hear you.</p>
      <button
        type="button"
        onClick={onEnd}
        className="flex items-center gap-2 rounded-full bg-red-600 px-6 py-3 font-semibold"
      >
        <PhoneOff className="h-5 w-5" /> End call
      </button>
    </div>
  );
}
