"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, UserPlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { loadMutualFriends } from "@/lib/chat";
import {
  inviteToLiveStage,
  loadMyJoinRequest,
  loadPendingJoinRequests,
  requestJoinLiveStage,
  respondJoinRequest,
} from "@/lib/live-stage";
import type { LiveJoinRequest, Profile } from "@/lib/types";
import { Avatar } from "@/components/Avatar";

export function LiveStagePanel({
  roomName,
  currentUser,
  isHost,
  isGuest,
  onGuestApproved,
}: {
  roomName: string;
  currentUser: Profile;
  hostId: string;
  isHost: boolean;
  isGuest: boolean;
  onGuestApproved?: () => void;
}) {
  const [requests, setRequests] = useState<LiveJoinRequest[]>([]);
  const [myRequest, setMyRequest] = useState<LiveJoinRequest | null>(null);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schemaMissing, setSchemaMissing] = useState(false);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    try {
      if (isHost) {
        const pending = await loadPendingJoinRequests(supabase, roomName);
        setRequests(pending);
        setSchemaMissing(false);
      } else {
        const mine = await loadMyJoinRequest(supabase, roomName, currentUser.id);
        setMyRequest(mine);
        setSchemaMissing(false);
      }
    } catch {
      setSchemaMissing(true);
    }
  }, [roomName, isHost, currentUser.id]);

  useEffect(() => {
    void refresh();
    if (isHost) {
      loadMutualFriends(createClient(), currentUser.id).then(setFriends);
    }

    const supabase = createClient();
    const channel = supabase
      .channel(`live-stage:${roomName}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_stream_join_requests",
          filter: `room_name=eq.${roomName}`,
        },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_stream_guests",
          filter: `room_name=eq.${roomName}`,
        },
        () => {
          void refresh();
          onGuestApproved?.();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomName, isHost, currentUser.id, refresh, onGuestApproved]);

  async function handleRequestJoin() {
    setLoading(true);
    setError(null);
    const { error: err } = await requestJoinLiveStage(
      createClient(),
      roomName,
      currentUser.id,
    );
    setLoading(false);
    if (err) setError(err);
    else void refresh();
  }

  async function handleInvite(friendId: string) {
    setError(null);
    setLoading(true);
    const { error: err } = await inviteToLiveStage(
      createClient(),
      roomName,
      currentUser.id,
      friendId,
    );
    setLoading(false);
    if (err) setError(err);
    else void refresh();
  }

  async function handleRespond(requestId: string, approve: boolean) {
    setError(null);
    const { error: err } = await respondJoinRequest(
      createClient(),
      requestId,
      currentUser.id,
      approve,
    );
    if (err) setError(err);
    else void refresh();
  }

  if (isHost) {
    return (
      <div className="vintage-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-vintage-rust" />
          <h3 className="text-sm font-bold text-vintage-ink">Invite & join requests</h3>
        </div>

        {schemaMissing && (
          <p className="mb-2 text-xs text-vintage-rust">
            Live stage tables missing — run{" "}
            <code className="text-[10px]">supabase/live-stage-schema.sql</code> in Supabase SQL
            Editor, then refresh.
          </p>
        )}

        {friends.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-vintage-ink-muted">
              Invite friends
            </p>
            <ul className="max-h-32 space-y-1 overflow-y-auto">
              {friends.slice(0, 8).map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-2 rounded-lg px-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar name={f.display_name} avatarUrl={f.avatar_url} size="sm" />
                    <span className="truncate text-sm text-vintage-ink">{f.display_name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleInvite(f.id)}
                    className="shrink-0 rounded-lg border border-vintage-border px-2 py-1 text-xs font-semibold text-vintage-rust hover:bg-vintage-rust/10"
                  >
                    Invite
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-vintage-ink-muted">
          Pending ({requests.length})
        </p>
        {requests.length === 0 ? (
          <p className="text-sm text-vintage-ink-muted">No pending requests yet.</p>
        ) : (
          <ul className="space-y-2">
            {requests.map((req) => (
              <li
                key={req.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-vintage-border p-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Avatar
                      name={req.profile?.display_name ?? "User"}
                      avatarUrl={req.profile?.avatar_url}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-vintage-ink">
                        {req.profile?.display_name ?? "Someone"}
                      </p>
                      <p className="text-[10px] uppercase tracking-wide text-vintage-ink-muted">
                        {req.request_type === "invite" ? "Invited" : "Requested to join"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => void handleRespond(req.id, true)}
                    className="rounded-lg bg-vintage-olive/20 p-2 text-vintage-olive"
                    aria-label="Approve"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRespond(req.id, false)}
                    className="rounded-lg bg-vintage-rust/15 p-2 text-vintage-rust"
                    aria-label="Decline"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {error && <p className="mt-2 text-xs text-vintage-rust">{error}</p>}
      </div>
    );
  }

  if (isGuest) {
    return (
      <div className="vintage-card border-vintage-olive/30 bg-vintage-olive/10 p-4 text-sm">
        <p className="font-semibold text-vintage-ink">You&apos;re on stage</p>
        <p className="mt-1 text-vintage-ink-muted">
          Your camera and mic are enabled — viewers can see you alongside the host and other co-hosts.
        </p>
      </div>
    );
  }

  return (
    <div className="vintage-card p-4">
      <div className="mb-2 flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-vintage-rust" />
        <h3 className="text-sm font-bold text-vintage-ink">Join on stage</h3>
      </div>
      <p className="text-sm text-vintage-ink-muted">
        Request to go live with the host — they can approve you as a co-host.
      </p>
      {myRequest ? (
        <p className="mt-3 rounded-lg bg-vintage-rust/10 px-3 py-2 text-sm font-medium text-vintage-rust">
          {myRequest.request_type === "invite"
            ? "You were invited — waiting for host approval."
            : "Request sent — waiting for host approval."}
        </p>
      ) : (
        <button
          type="button"
          disabled={loading}
          onClick={() => void handleRequestJoin()}
          className="vintage-btn mt-3 inline-flex w-full items-center justify-center gap-2 py-2.5 text-sm disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Request to join
        </button>
      )}
      {error && <p className="mt-2 text-xs text-vintage-rust">{error}</p>}
    </div>
  );
}
