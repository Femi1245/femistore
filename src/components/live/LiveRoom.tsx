"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track, type LocalVideoTrack } from "livekit-client";
import { Loader2, Mic, MicOff, Radio, Video, VideoOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { LiveAREffect, LiveEffectMode } from "@/lib/deepar-config";
import { defaultLiveEffectMode } from "@/lib/deepar-config";
import type { LiveVideoEffect } from "@/lib/live-video-effects";
import type { LiveStream, Profile } from "@/lib/types";
import { LiveChat } from "@/components/live/LiveChat";
import { LiveEffectPicker } from "@/components/live/LiveEffectPicker";
import { LiveStagePanel } from "@/components/live/LiveStagePanel";
import { LiveViewersPanel } from "@/components/live/LiveViewersPanel";
import { useLiveStreamEffects } from "@/components/live/useLiveStreamEffects";
import { GiftPickerModal } from "@/components/gifts/GiftPickerModal";
import { LiveGiftFeed } from "@/components/gifts/LiveGiftFeed";

function StageVideo() {
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
    <div className={`grid gap-2 ${cameraTracks.length > 1 ? "sm:grid-cols-2" : ""}`}>
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

function PublisherStage({
  effectMode,
  onEffectModeChange,
  videoEffect,
  onVideoEffectChange,
  arEffect,
  onArEffectChange,
  showEffects,
  endLabel,
  onEnd,
}: {
  effectMode: LiveEffectMode;
  onEffectModeChange: (mode: LiveEffectMode) => void;
  videoEffect: LiveVideoEffect;
  onVideoEffectChange: (e: LiveVideoEffect) => void;
  arEffect: LiveAREffect;
  onArEffectChange: (e: LiveAREffect) => void;
  showEffects: boolean;
  endLabel?: string;
  onEnd?: () => void;
}) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false },
  );

  const localCam = tracks.find(
    (t) =>
      t.participant.isLocal &&
      t.source === Track.Source.Camera &&
      t.publication?.kind === Track.Kind.Video,
  );
  const videoTrack = localCam?.publication?.track as LocalVideoTrack | undefined;

  const { arStatus, arError } = useLiveStreamEffects(
    videoTrack,
    effectMode,
    videoEffect,
    arEffect,
    showEffects && !!videoTrack && isCameraEnabled,
  );

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-sm border-2 border-vintage-border bg-black">
        <div className="aspect-video">
          {localCam && localCam.publication ? (
            <VideoTrack trackRef={localCam} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full min-h-[240px] items-center justify-center text-sm text-vintage-ink-muted">
              Camera is off
            </div>
          )}
        </div>
      </div>

      {showEffects && (
        <LiveEffectPicker
          mode={effectMode}
          onModeChange={onEffectModeChange}
          videoEffect={videoEffect}
          onVideoEffectChange={onVideoEffectChange}
          arEffect={arEffect}
          onArEffectChange={onArEffectChange}
          arStatus={arStatus}
          arError={arError}
          disabled={!isCameraEnabled}
        />
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
          className="vintage-btn-outline inline-flex flex-1 items-center justify-center gap-2 py-2.5 text-sm"
        >
          {isMicrophoneEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          {isMicrophoneEnabled ? "Mute" : "Unmute"}
        </button>
        <button
          type="button"
          onClick={() => void localParticipant.setCameraEnabled(!isCameraEnabled)}
          className="vintage-btn-outline inline-flex flex-1 items-center justify-center gap-2 py-2.5 text-sm"
        >
          {isCameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          {isCameraEnabled ? "Camera off" : "Camera on"}
        </button>
      </div>

      {onEnd && endLabel && (
        <button type="button" onClick={onEnd} className="vintage-btn w-full py-3">
          {endLabel}
        </button>
      )}
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
  const [isGuest, setIsGuest] = useState(false);
  const [canPublish, setCanPublish] = useState(false);
  const [roomKey, setRoomKey] = useState(0);
  const [effectMode, setEffectMode] = useState<LiveEffectMode>(defaultLiveEffectMode);
  const [videoEffect, setVideoEffect] = useState<LiveVideoEffect>("none");
  const [arEffect, setArEffect] = useState<LiveAREffect>("ar_none");
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
    setIsGuest(!!data.isGuest);
    setCanPublish(!!data.canPublish);
    setLoading(false);
    setRoomKey((k) => k + 1);
  }, [roomName]);

  useEffect(() => {
    void fetchToken();
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

  const handleGuestApproved = useCallback(() => {
    if (isHost) return;
    void fetchToken();
  }, [fetchToken, isHost]);

  async function handleEndLive() {
    await fetch("/api/live/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomName }),
    });
    router.push("/live");
    router.refresh();
  }

  if (loading && !token) {
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
        <button type="button" onClick={() => void fetchToken()} className="vintage-btn-outline mt-4 px-4 py-2">
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
          onClick={() => {
            if (typeof window !== "undefined" && document.referrer) {
              try {
                if (new URL(document.referrer).origin === window.location.origin) {
                  router.back();
                  return;
                }
              } catch {
                /* fall through */
              }
            }
            router.push("/live");
          }}
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
        <span className="flex items-center gap-1.5 rounded-sm bg-vintage-rust px-2 py-1 text-xs font-bold text-on-rust">
          <Radio className="h-3 w-3 animate-pulse" />
          LIVE
        </span>
        <h1 className="font-display text-xl font-bold text-vintage-ink">{stream.title}</h1>
      </div>

      <LiveKitRoom
        key={roomKey}
        token={token}
        serverUrl={serverUrl}
        connect
        video={canPublish}
        audio={canPublish}
        onDisconnected={() => {
          if (isHost) router.push("/live");
        }}
        className="livekit-room"
      >
        <RoomAudioRenderer />
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div>
            {canPublish ? (
              <PublisherStage
                effectMode={effectMode}
                onEffectModeChange={setEffectMode}
                videoEffect={videoEffect}
                onVideoEffectChange={setVideoEffect}
                arEffect={arEffect}
                onArEffectChange={setArEffect}
                showEffects={isHost}
                endLabel={isHost ? "End live stream" : undefined}
                onEnd={isHost ? handleEndLive : undefined}
              />
            ) : (
              <StageVideo />
            )}

            {!canPublish && (
              <p className="mt-3 text-center text-sm text-vintage-ink-muted">
                You are watching {stream.host_id === currentUser.id ? "your" : "a"} live stream
              </p>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <LiveViewersPanel
              roomName={roomName}
              currentUserId={currentUser.id}
              hostId={stream.host_id}
            />
            <LiveStagePanel
              roomName={roomName}
              currentUser={currentUser}
              hostId={stream.host_id}
              isHost={isHost}
              isGuest={isGuest}
              onGuestApproved={handleGuestApproved}
            />
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
      </LiveKitRoom>

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
