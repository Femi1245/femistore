"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useParticipants,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Loader2, Mic, MicOff, PhoneOff } from "lucide-react";
import type { Profile, VoiceRoom } from "@/lib/types";
import { isBenignLiveKitError } from "@/lib/livekit-errors";
import { hostDisplayName } from "@/lib/voice-rooms";

function VoiceControls({
  isHost,
  onLeave,
}: {
  isHost: boolean;
  onLeave: () => void;
}) {
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    void localParticipant.setMicrophoneEnabled(true);
  }, [localParticipant]);

  async function toggleMic() {
    const next = !muted;
    await localParticipant.setMicrophoneEnabled(!next);
    setMuted(next);
  }

  return (
    <div className="space-y-4">
      <div className="vintage-card p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-vintage-ink-muted">
          In the lounge ({participants.length})
        </p>
        <ul className="space-y-2">
          {participants.map((p) => (
            <li
              key={p.identity}
              className="flex items-center justify-between rounded-lg bg-vintage-paper-dark/50 px-3 py-2 text-sm"
            >
              <span className="font-medium text-vintage-ink">{p.name || p.identity}</span>
              {p.isSpeaking && (
                <span className="text-xs font-semibold text-vintage-rust">Speaking</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void toggleMic()}
          className="vintage-btn-outline flex flex-1 items-center justify-center gap-2 py-3"
        >
          {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          {muted ? "Unmute" : "Mute"}
        </button>
        <button
          type="button"
          onClick={onLeave}
          className="vintage-btn flex flex-1 items-center justify-center gap-2 py-3"
        >
          <PhoneOff className="h-4 w-4" />
          {isHost ? "End lounge" : "Leave"}
        </button>
      </div>
    </div>
  );
}

export function VoiceRoomView({
  roomName,
  room,
}: {
  roomName: string;
  room: VoiceRoom;
  currentUser?: Profile;
}) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/voice/token?room=${encodeURIComponent(roomName)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setToken(data.token);
        setServerUrl(data.serverUrl);
        setIsHost(data.isHost);
      })
      .catch(() => setError("Could not join lounge"));
  }, [roomName]);

  const handleLeave = useCallback(async () => {
    if (isHost) {
      await fetch("/api/voice/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName }),
      });
    }
    router.push("/live?tab=voice");
  }, [isHost, roomName, router]);

  if (error) {
    return (
      <div className="vintage-card p-8 text-center">
        <p className="text-vintage-rust">{error}</p>
      </div>
    );
  }

  if (!token || !serverUrl) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-vintage-rust" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-vintage-ink">{room.title}</h1>
        {room.topic && (
          <p className="text-sm text-vintage-ink-muted">{room.topic}</p>
        )}
        <p className="mt-1 text-xs text-vintage-ink-muted">
          Hosted by {hostDisplayName(room.host)}
        </p>
      </div>

      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect
        audio
        video={false}
        onError={(err) => {
          if (isBenignLiveKitError(err)) return;
          setError(err.message || "Could not stay connected to the lounge");
        }}
        onDisconnected={() => router.push("/live?tab=voice")}
      >
        <RoomAudioRenderer />
        <VoiceControls isHost={isHost} onLeave={() => void handleLeave()} />
      </LiveKitRoom>
    </div>
  );
}
