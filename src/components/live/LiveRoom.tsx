"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { RoomEvent, Track, type LocalVideoTrack } from "livekit-client";
import {
  ArrowLeft,
  Eye,
  Gift,
  Loader2,
  Mic,
  MicOff,
  Radio,
  Sparkles,
  UserPlus,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { LiveAREffect, LiveEffectMode } from "@/lib/deepar-config";
import { defaultLiveEffectMode } from "@/lib/deepar-config";
import type { LiveVideoEffect } from "@/lib/live-video-effects";
import type { LiveStream, Profile } from "@/lib/types";
import { LiveChat } from "@/components/live/LiveChat";
import { LiveEffectPicker } from "@/components/live/LiveEffectPicker";
import { LiveStagePanel } from "@/components/live/LiveStagePanel";
import { useLiveStreamEffects } from "@/components/live/useLiveStreamEffects";
import { GiftPickerModal } from "@/components/gifts/GiftPickerModal";
import { LiveGiftFeed } from "@/components/gifts/LiveGiftFeed";

/** If LiveKit connected but camera stayed muted/off, re-enable once. */
function EnsurePublisherCamera({ active }: { active: boolean }) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    const enable = async () => {
      try {
        if (!localParticipant.isCameraEnabled) {
          await localParticipant.setCameraEnabled(true);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[Live] camera enable failed:", err);
        }
      }
    };

    void enable();
    const onConnected = () => {
      void enable();
    };
    room.on(RoomEvent.Connected, onConnected);
    room.on(RoomEvent.LocalTrackPublished, onConnected);

    const timer = window.setTimeout(() => {
      if (!cancelled && !localParticipant.isCameraEnabled) {
        void enable();
      }
    }, 800);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      room.off(RoomEvent.Connected, onConnected);
      room.off(RoomEvent.LocalTrackPublished, onConnected);
    };
  }, [active, localParticipant, room]);

  return null;
}

function ViewerCountBadge() {
  const participants = useParticipants();
  const count = Math.max(1, participants.length);
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
      <Eye className="h-3.5 w-3.5" />
      {count}
    </span>
  );
}

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
      <div className="flex h-full w-full items-center justify-center bg-zinc-950">
        <p className="text-sm text-white/60">Waiting for host video…</p>
      </div>
    );
  }

  if (cameraTracks.length === 1) {
    return (
      <VideoTrack
        trackRef={cameraTracks[0]}
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <div className="grid h-full w-full grid-cols-2 gap-0.5 bg-black">
      {cameraTracks.map((track) => (
        <VideoTrack
          key={track.publication.trackSid}
          trackRef={track}
          className="h-full w-full object-cover"
        />
      ))}
    </div>
  );
}

function PublisherControls({
  showEffects,
  effectsOpen,
  onToggleEffects,
  endLabel,
  onEnd,
}: {
  showEffects: boolean;
  effectsOpen: boolean;
  onToggleEffects: () => void;
  endLabel?: string;
  onEnd?: () => void;
}) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } =
    useLocalParticipant();

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md"
        aria-label={isMicrophoneEnabled ? "Mute" : "Unmute"}
      >
        {isMicrophoneEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
      </button>
      <button
        type="button"
        onClick={() => {
          void (async () => {
            try {
              await localParticipant.setCameraEnabled(!isCameraEnabled);
            } catch (err) {
              console.error("[Live] camera toggle failed:", err);
              try {
                await localParticipant.setCameraEnabled(false);
                await localParticipant.setCameraEnabled(true);
              } catch (retryErr) {
                console.error("[Live] camera restart failed:", retryErr);
              }
            }
          })();
        }}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md"
        aria-label={isCameraEnabled ? "Camera off" : "Camera on"}
      >
        {isCameraEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
      </button>
      {showEffects && (
        <button
          type="button"
          onClick={onToggleEffects}
          className={`inline-flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-md ${
            effectsOpen ? "bg-red-500 text-white" : "bg-black/55 text-white"
          }`}
          aria-label="Effects"
        >
          <Sparkles className="h-5 w-5" />
        </button>
      )}
      {onEnd && endLabel && (
        <button
          type="button"
          onClick={onEnd}
          className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white"
        >
          End
        </button>
      )}
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
  showEffectsPicker,
}: {
  effectMode: LiveEffectMode;
  onEffectModeChange: (mode: LiveEffectMode) => void;
  videoEffect: LiveVideoEffect;
  onVideoEffectChange: (e: LiveVideoEffect) => void;
  arEffect: LiveAREffect;
  onArEffectChange: (e: LiveAREffect) => void;
  showEffectsPicker: boolean;
}) {
  const { isCameraEnabled } = useLocalParticipant();
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
    !!videoTrack && isCameraEnabled,
  );

  return (
    <>
      <div className="absolute inset-0">
        {localCam && localCam.publication && isCameraEnabled ? (
          <VideoTrack trackRef={localCam} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-zinc-950">
            <p className="text-sm text-white/60">Camera is off</p>
          </div>
        )}
      </div>
      {showEffectsPicker && (
        <div className="absolute inset-x-0 bottom-[7.5rem] z-30 mx-auto max-h-[40vh] w-full max-w-lg overflow-y-auto px-3">
          <div className="rounded-2xl bg-black/70 p-3 backdrop-blur-md">
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
          </div>
        </div>
      )}
    </>
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
  const [effectsOpen, setEffectsOpen] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);
  const [giftsOpen, setGiftsOpen] = useState(false);

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

  function leaveLive() {
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
  }

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
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-red-400" />
        <p className="text-white/70">Connecting to live room…</p>
      </div>
    );
  }

  if (error || !token || !serverUrl) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-black px-6 text-center">
        <p className="text-red-400">{error ?? "Connection failed"}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={leaveLive}
            className="rounded-full border border-white/30 px-4 py-2 text-sm text-white"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => void fetchToken()}
            className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!stream.is_live) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-black px-6 text-center">
        <p className="font-display text-lg font-semibold text-white">This stream has ended</p>
        <button
          type="button"
          onClick={leaveLive}
          className="rounded-full bg-red-500 px-6 py-2.5 text-sm font-semibold text-white"
        >
          Browse live streams
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <LiveKitRoom
        key={roomKey}
        token={token}
        serverUrl={serverUrl}
        connect
        video={canPublish}
        audio={canPublish}
        onMediaDeviceFailure={(failure) => {
          const reason = String(failure ?? "");
          const message =
            reason.includes("PermissionDenied") || reason.includes("NotAllowed")
              ? "Camera or mic permission was blocked. Allow access in your browser, then try again."
              : reason.includes("NotFound")
                ? "No camera was found on this device."
                : "Could not start the camera. Check permissions and try again.";
          setError(message);
        }}
        onError={(err) => {
          console.error("[Live] room error:", err);
          setError(err.message || "Live connection error");
        }}
        onDisconnected={() => {
          if (isHost) router.push("/live");
        }}
        className="absolute inset-0 h-full w-full"
      >
        <RoomAudioRenderer />
        {canPublish && <EnsurePublisherCamera active={canPublish} />}

        {/* Full-bleed camera */}
        {canPublish ? (
          <PublisherStage
            effectMode={effectMode}
            onEffectModeChange={setEffectMode}
            videoEffect={videoEffect}
            onVideoEffectChange={setVideoEffect}
            arEffect={arEffect}
            onArEffectChange={setArEffect}
            showEffectsPicker={isHost && effectsOpen}
          />
        ) : (
          <div className="absolute inset-0">
            <StageVideo />
          </div>
        )}

        {/* Top gradient + header */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/70 via-black/25 to-transparent pb-16 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="pointer-events-auto flex items-start gap-3 px-3 sm:px-4">
            <button
              type="button"
              onClick={leaveLive}
              className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm"
              aria-label="Leave live"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-sm bg-red-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                  <Radio className="h-3 w-3 animate-pulse" />
                  Live
                </span>
                <ViewerCountBadge />
              </div>
              <h1 className="mt-1 truncate font-display text-base font-bold text-white drop-shadow sm:text-lg">
                {stream.title}
              </h1>
              {host && (
                <p className="truncate text-xs text-white/80">{host.display_name}</p>
              )}
            </div>
            <button
              type="button"
              onClick={leaveLive}
              className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm md:hidden"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Right-side actions */}
        <div className="absolute right-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-3 sm:right-4">
          {host && currentUser.id !== host.id && (
            <button
              type="button"
              onClick={() => setShowGift(true)}
              className="inline-flex h-12 w-12 flex-col items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md"
              aria-label="Send gift"
            >
              <Gift className="h-5 w-5" />
            </button>
          )}
          {host && currentUser.id === host.id && (
            <button
              type="button"
              onClick={() => setGiftsOpen((v) => !v)}
              className={`inline-flex h-12 w-12 items-center justify-center rounded-full backdrop-blur-md ${
                giftsOpen ? "bg-red-500 text-white" : "bg-black/50 text-white"
              }`}
              aria-label="Gifts"
            >
              <Gift className="h-5 w-5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setStageOpen((v) => !v)}
            className={`inline-flex h-12 w-12 items-center justify-center rounded-full backdrop-blur-md ${
              stageOpen ? "bg-red-500 text-white" : "bg-black/50 text-white"
            }`}
            aria-label="Stage"
          >
            <UserPlus className="h-5 w-5" />
          </button>
        </div>

        {/* Side panels */}
        {stageOpen && (
          <div className="absolute bottom-36 right-3 z-30 w-[min(100%-1.5rem,20rem)] overflow-hidden rounded-2xl shadow-xl sm:right-4">
            <LiveStagePanel
              roomName={roomName}
              currentUser={currentUser}
              hostId={stream.host_id}
              isHost={isHost}
              isGuest={isGuest}
              onGuestApproved={handleGuestApproved}
            />
          </div>
        )}
        {giftsOpen && host && (
          <div className="absolute bottom-36 right-3 z-30 w-[min(100%-1.5rem,20rem)] overflow-hidden rounded-2xl shadow-xl sm:right-4">
            <LiveGiftFeed
              roomName={roomName}
              host={host}
              currentUser={currentUser}
              onSendGift={() => setShowGift(true)}
            />
          </div>
        )}

        {/* Bottom: host controls + chat */}
        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-24">
          {canPublish && (
            <div className="mb-2 px-3">
              <PublisherControls
                showEffects={isHost}
                effectsOpen={effectsOpen}
                onToggleEffects={() => setEffectsOpen((v) => !v)}
                endLabel={isHost ? "End live stream" : undefined}
                onEnd={isHost ? handleEndLive : undefined}
              />
            </div>
          )}
          <LiveChat
            roomName={roomName}
            currentUser={currentUser}
            hostId={stream.host_id}
            isLive={stream.is_live}
            variant="overlay"
          />
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
