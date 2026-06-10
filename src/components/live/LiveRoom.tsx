"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  VideoConference,
  VideoTrack,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { Loader2, Radio } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { LiveStream, Profile } from "@/lib/types";
import { LiveChat } from "@/components/live/LiveChat";
import { GiftPickerModal } from "@/components/gifts/GiftPickerModal";
import { LiveGiftFeed } from "@/components/gifts/LiveGiftFeed";

function ViewerVideo() {
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: false }],
    { onlySubscribed: true },
  );

  const cameraTracks = tracks.filter(
    (
      t,
    ): t is (typeof tracks)[number] & {
      publication: NonNullable<(typeof tracks)[number]["publication"]>;
    } => t.publication?.kind === Track.Kind.Video,
  );

  if (cameraTracks.length === 0) {
    return (
      <div className="flex aspect-video items-center justify-center vintage-card-inset">
        <p className="text-vintage-ink-muted">Waiting for host video…</p>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {cameraTracks.map((track) => (
        <VideoTrack
          key={track.publication.trackSid}
          trackRef={track}
          className="aspect-video w-full rounded-sm object-cover"
        />
      ))}
    </div>
  );
}

function HostStage({ onEndLive }: { onEndLive: () => void }) {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-sm border-2 border-vintage-border [&_.lk-video-conference]:min-h-[360px]">
        <VideoConference />
      </div>
      <button type="button" onClick={onEndLive} className="vintage-btn w-full py-3">
        End live stream
      </button>
    </div>
  );
}

export function LiveRoom({
  roomName,
  stream,
  currentUser,
}: {
  roomName: string;
  stream: LiveStream;
  currentUser: Profile;
}) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [host, setHost] = useState<Profile | null>(stream.host ?? null);
  const [showGift, setShowGift] = useState(false);

  const fetchToken = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/live/token?room=${encodeURIComponent(roomName)}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not join stream");
      setLoading(false);
      return;
    }
    setToken(data.token);
    setServerUrl(data.serverUrl);
    setIsHost(data.isHost);
    setLoading(false);
  }, [roomName]);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  useEffect(() => {
    if (host) return;
    createClient()
      .from("profiles")
      .select("*")
      .eq("id", stream.host_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setHost(data as Profile);
      });
  }, [stream.host_id, host]);

  async function handleEndLive() {
    await fetch("/api/live/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomName }),
    });
    router.push("/live");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <Loader2 className="h-8 w-8 animate-spin text-vintage-rust" />
        <p className="text-vintage-ink-muted">Connecting to live room…</p>
      </div>
    );
  }

  if (error || !token || !serverUrl) {
    return (
      <div className="vintage-card p-6 text-center">
        <p className="text-vintage-rust">{error ?? "Connection failed"}</p>
        <button type="button" onClick={fetchToken} className="vintage-btn-outline mt-4 px-4 py-2">
          Try again
        </button>
      </div>
    );
  }

  if (!stream.is_live) {
    return (
      <div className="vintage-card p-8 text-center">
        <p className="font-display text-lg font-semibold">This stream has ended</p>
        <button
          type="button"
          onClick={() => router.push("/live")}
          className="vintage-btn mt-4 px-6 py-2"
        >
          Browse live streams
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-sm bg-vintage-rust px-2 py-1 text-xs font-bold text-[var(--vintage-btn-text)]">
          <Radio className="h-3 w-3 animate-pulse" />
          LIVE
        </span>
        <h1 className="font-display text-xl font-bold text-vintage-ink">{stream.title}</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div>
          <LiveKitRoom
            token={token}
            serverUrl={serverUrl}
            connect
            video={isHost}
            audio={isHost}
            onDisconnected={() => {
              if (isHost) router.push("/live");
            }}
            className="livekit-room"
          >
            <RoomAudioRenderer />
            {isHost ? (
              <HostStage onEndLive={handleEndLive} />
            ) : (
              <ViewerVideo />
            )}
          </LiveKitRoom>

          {!isHost && (
            <p className="mt-3 text-center text-sm text-vintage-ink-muted">
              You are watching {stream.host_id === currentUser.id ? "your" : "a"} live stream
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {host && (
            <LiveGiftFeed
              roomName={roomName}
              host={host}
              currentUser={currentUser}
              onSendGift={() => setShowGift(true)}
            />
          )}
          <LiveChat
            roomName={roomName}
            currentUser={currentUser}
            hostId={stream.host_id}
            isLive={stream.is_live}
          />
        </div>
      </div>

      {showGift && host && currentUser.id !== host.id && (
        <GiftPickerModal
          recipient={host}
          context="live"
          roomName={roomName}
          onClose={() => setShowGift(false)}
        />
      )}
    </div>
  );
}
