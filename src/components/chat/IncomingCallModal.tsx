"use client";

import { Phone, PhoneOff, Video } from "lucide-react";
import type { CallSession, Profile } from "@/lib/types";
import { Avatar } from "@/components/Avatar";

export function IncomingCallModal({
  session,
  caller,
  onAccept,
  onDecline,
}: {
  session: CallSession;
  caller: Profile | null;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const name = caller?.display_name ?? "Someone";
  const isVideo = session.call_type === "video";

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4">
      <div className="vintage-card w-full max-w-sm p-6 text-center">
        <Avatar name={name} avatarUrl={caller?.avatar_url ?? null} size="xl" />
        <p className="mt-4 font-display text-lg font-bold">{name}</p>
        <p className="text-sm text-vintage-ink-muted">
          {session.status === "active"
            ? `Join ${isVideo ? "group video" : "group voice"} call…`
            : `Incoming ${isVideo ? "video" : "voice"} call…`}
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onDecline}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-red-100 px-4 py-3 text-red-700"
          >
            <PhoneOff className="h-5 w-5" /> Decline
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="vintage-btn flex flex-1 items-center justify-center gap-2 py-3"
          >
            {isVideo ? <Video className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
            {session.status === "active" ? "Join" : "Accept"}
          </button>
        </div>
      </div>
    </div>
  );
}
