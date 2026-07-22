"use client";

import { useCallback, useEffect, useId, useState, type CSSProperties } from "react";
import { RoomEvent, type DataPacket_Kind } from "livekit-client";
import { useLocalParticipant, useRoomContext } from "@livekit/components-react";
import {
  LIVE_REACTION_EMOJIS,
  decodeLiveReaction,
  encodeLiveReaction,
} from "@/lib/live-reactions";

type FloatingReaction = {
  id: string;
  emoji: string;
  left: number;
  drift: number;
};

type LiveReactionsProps = {
  currentUserId: string;
  displayName: string;
  /** Offset below vertical center so it sits under Gift in the action stack. */
  buttonOffsetClassName?: string;
};

/** Floating emoji overlay + react button for live rooms (room-rooted absolute). */
export function LiveReactions({
  currentUserId,
  displayName,
  buttonOffsetClassName = "top-[calc(50%+0.75rem)]",
}: LiveReactionsProps) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const idPrefix = useId();
  const [floating, setFloating] = useState<FloatingReaction[]>([]);
  const [burstOpen, setBurstOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const spawn = useCallback(
    (emoji: string) => {
      const id = `${idPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const left = 18 + Math.random() * 48;
      const drift = (Math.random() - 0.5) * 40;
      setFloating((prev) => [...prev.slice(-24), { id, emoji, left, drift }]);
      window.setTimeout(() => {
        setFloating((prev) => prev.filter((item) => item.id !== id));
      }, 2400);
    },
    [idPrefix],
  );

  useEffect(() => {
    const onData = (
      payload: Uint8Array,
      _participant?: unknown,
      _kind?: DataPacket_Kind,
      topic?: string,
    ) => {
      if (topic && topic !== "zumelia.live.reaction") return;
      const decoded = decodeLiveReaction(payload);
      if (!decoded) return;
      if (decoded.from === currentUserId) return;
      spawn(decoded.emoji);
    };

    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room, currentUserId, spawn]);

  async function sendReaction(emoji: string) {
    if (sending) return;
    setSending(true);
    spawn(emoji);
    try {
      await localParticipant.publishData(
        encodeLiveReaction(emoji, currentUserId, displayName),
        {
          reliable: false,
          topic: "zumelia.live.reaction",
        },
      );
    } catch (err) {
      console.error("[Live] reaction send failed:", err);
    } finally {
      setSending(false);
      setBurstOpen(false);
    }
  }

  return (
    <>
      <div
        className="pointer-events-none absolute inset-x-0 bottom-28 top-24 z-10 overflow-hidden"
        aria-hidden
      >
        {floating.map((item) => (
          <span
            key={item.id}
            className="live-reaction-float absolute bottom-0 text-2xl drop-shadow-lg sm:text-3xl"
            style={
              {
                left: `${item.left}%`,
                "--reaction-drift": `${item.drift}px`,
              } as CSSProperties
            }
          >
            {item.emoji}
          </span>
        ))}
      </div>

      <div
        className={`absolute right-3 z-20 flex -translate-y-1/2 flex-col items-center gap-2 sm:right-4 ${buttonOffsetClassName}`}
      >
        {burstOpen && (
          <div className="flex flex-col gap-1.5 rounded-2xl bg-black/70 p-2 backdrop-blur-md">
            {LIVE_REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => void sendReaction(emoji)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-xl transition hover:bg-white/10 active:scale-90"
                aria-label={`React ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            if (burstOpen) {
              void sendReaction("❤️");
              return;
            }
            setBurstOpen(true);
          }}
          className={`inline-flex h-12 w-12 items-center justify-center rounded-full text-xl shadow-lg ring-1 ring-white/25 transition active:scale-95 ${
            burstOpen ? "bg-red-600 text-white" : "bg-zinc-900/85 text-white"
          }`}
          aria-label="Send reaction"
          aria-expanded={burstOpen}
        >
          ❤️
        </button>
      </div>
    </>
  );
}
