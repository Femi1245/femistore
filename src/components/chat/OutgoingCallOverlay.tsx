"use client";

import { useEffect, useState } from "react";
import { Loader2, PhoneOff, Wifi, WifiOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatLastSeen, isOnline } from "@/lib/presence";
import { Avatar } from "@/components/Avatar";
import type { CallSession, Profile } from "@/lib/types";

const RING_TIMEOUT_MS = 60_000;

type DeliveryPhase = "calling" | "delivered" | "connecting" | "unavailable";

function getDeliveryPhase(session: CallSession, calleeOnline: boolean): DeliveryPhase {
  if (session.status === "active") return "connecting";
  if (session.delivered_at) return "delivered";
  if (!calleeOnline) return "unavailable";
  return "calling";
}

function phaseLabel(phase: DeliveryPhase, calleeName: string): string {
  switch (phase) {
    case "connecting":
      return "Connecting…";
    case "delivered":
      return "Ringing — delivered to their device";
    case "unavailable":
      return `${calleeName} is offline — waiting for connection`;
    default:
      return "Calling…";
  }
}

export function OutgoingCallOverlay({
  session: initialSession,
  callee,
  title,
  onCancel,
  onAnswered,
  onEnded,
}: {
  session: CallSession;
  callee: Profile | null;
  title: string;
  onCancel: () => void;
  onAnswered: (session: CallSession) => void;
  onEnded: () => void;
}) {
  const [session, setSession] = useState(initialSession);
  const [calleePresence, setCalleePresence] = useState<Profile | null>(callee);
  const [ending, setEnding] = useState(false);

  const calleeName = calleePresence?.display_name ?? title;
  const calleeOnline = isOnline(calleePresence?.last_seen_at);
  const phase = getDeliveryPhase(session, calleeOnline);
  const isVideo = session.call_type === "video";

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`outgoing-call:${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "call_sessions",
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          const updated = payload.new as CallSession;
          setSession(updated);
          if (updated.status === "active") {
            onAnswered(updated);
          } else if (["declined", "missed", "ended"].includes(updated.status)) {
            onEnded();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onAnswered, onEnded, session.id]);

  useEffect(() => {
    if (!callee?.id) return;
    const supabase = createClient();

    const refresh = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", callee.id)
        .maybeSingle();
      if (data) setCalleePresence(data as Profile);
    };

    refresh();
    const interval = window.setInterval(refresh, 15_000);
    return () => window.clearInterval(interval);
  }, [callee?.id]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      if (session.status !== "ringing") return;
      setEnding(true);
      await fetch("/api/calls/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, missed: true }),
      });
      onEnded();
    }, RING_TIMEOUT_MS);

    return () => window.clearTimeout(timer);
  }, [onEnded, session.id, session.status]);

  async function handleCancel() {
    setEnding(true);
    await onCancel();
  }

  return (
    <div className="fixed inset-0 z-[95] flex flex-col items-center justify-center bg-gradient-to-b from-vintage-paper to-vintage-paper-dark p-6">
      <div className="vintage-card w-full max-w-sm p-8 text-center">
        <div className="relative mx-auto w-fit">
          <Avatar
            name={calleeName}
            avatarUrl={calleePresence?.avatar_url ?? null}
            size="xl"
          />
          <span
            className={`absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-vintage-paper ${
              calleeOnline ? "bg-vintage-olive text-white" : "bg-vintage-ink-muted/30 text-vintage-ink-muted"
            }`}
          >
            {calleeOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          </span>
        </div>

        <p className="mt-5 font-display text-xl font-bold">{calleeName}</p>
        <p className="mt-1 text-sm text-vintage-ink-muted">
          {isVideo ? "Video call" : "Voice call"}
        </p>

        <div className="mt-4 space-y-2">
          <p className="flex items-center justify-center gap-2 text-sm font-medium text-vintage-ink">
            {phase === "connecting" ? (
              <Loader2 className="h-4 w-4 animate-spin text-vintage-rust" />
            ) : (
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  phase === "delivered"
                    ? "animate-pulse bg-vintage-olive"
                    : phase === "unavailable"
                      ? "bg-vintage-ink-muted"
                      : "animate-pulse bg-vintage-rust"
                }`}
              />
            )}
            {phaseLabel(phase, calleeName)}
          </p>

          {calleePresence?.last_seen_at != null && (
            <p
              className={`text-xs ${
                calleeOnline ? "font-medium text-vintage-olive" : "text-vintage-ink-muted"
              }`}
            >
              {formatLastSeen(calleePresence.last_seen_at)}
            </p>
          )}

          {phase === "delivered" && (
            <p className="text-xs text-vintage-olive">
              They&apos;re online and should see your call now
            </p>
          )}

          {phase === "unavailable" && !session.delivered_at && (
            <p className="text-xs text-vintage-ink-muted">
              Call will ring when they open Zumelia with internet
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleCancel}
          disabled={ending}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-red-100 px-4 py-3.5 font-semibold text-red-700 transition hover:bg-red-200 disabled:opacity-50"
        >
          {ending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <PhoneOff className="h-5 w-5" />
          )}
          Cancel call
        </button>
      </div>
    </div>
  );
}
