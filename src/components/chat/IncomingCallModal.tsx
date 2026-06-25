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
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="vintage-card w-full max-w-sm p-6 text-center shadow-2xl">
        <div className="relative mx-auto w-fit">
          <Avatar name={name} avatarUrl={caller?.avatar_url ?? null} size="xl" />
          <span className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-vintage-rust text-on-rust ring-4 ring-vintage-paper">
            {isVideo ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
          </span>
        </div>
        <p className="mt-4 font-display text-lg font-bold">{name}</p>
        <p className="mt-1 text-sm text-vintage-ink-muted">
          {session.status === "active"
            ? `Join ${isVideo ? "group video" : "group voice"} call…`
            : `Incoming ${isVideo ? "video" : "voice"} call`}
        </p>
        {session.status === "ringing" && (
          <p className="mt-2 flex items-center justify-center gap-2 text-xs font-medium text-vintage-olive">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-vintage-olive" />
            Ringing now
          </p>
        )}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onDecline}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-red-100 px-4 py-3 font-semibold text-red-700 transition hover:bg-red-200"
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
