"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, UserPlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  acceptConnectionRequest,
  declineConnectionRequest,
  loadIncomingConnectionRequests,
} from "@/lib/connection-requests";
import type { ConnectionRequest } from "@/lib/types";
import { Avatar } from "@/components/Avatar";

export function ConnectionRequestsPanel({
  userId,
  onChanged,
}: {
  userId: string;
  onChanged?: () => void;
}) {
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);

  const refresh = useCallback(async () => {
    const rows = await loadIncomingConnectionRequests(createClient(), userId);
    setRequests(rows);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleAccept(req: ConnectionRequest) {
    const { error } = await acceptConnectionRequest(createClient(), req.id);
    if (!error) {
      await refresh();
      onChanged?.();
    }
  }

  async function handleDecline(req: ConnectionRequest) {
    await declineConnectionRequest(createClient(), req.id, userId);
    await refresh();
    onChanged?.();
  }

  if (!requests.length) {
    return (
      <section className="mb-4">
        <div className="vintage-card-inset flex flex-col items-start gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm text-vintage-ink-muted">
            <UserPlus className="h-4 w-4 shrink-0 text-vintage-rust" />
            Connection requests from other users appear here.
          </p>
          <Link
            href="/chat"
            className="text-xs font-semibold text-vintage-rust hover:underline"
          >
            Discover people in Chat
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-6">
      <h2 className="editorial-eyebrow mb-3">Connection requests</h2>
      <div className="space-y-2">
        {requests.map((req) => {
          const user = req.from_user;
          const name = user?.display_name ?? "Someone";
          const href = user ? `/profile/${user.username}` : "#";

          return (
            <div
              key={req.id}
              className="flex items-center gap-3 rounded-xl vintage-card-inset p-3"
            >
              <Link href={href}>
                <Avatar name={name} avatarUrl={user?.avatar_url ?? null} size="md" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={href} className="font-semibold text-vintage-ink hover:text-vintage-rust">
                  {name}
                </Link>
                <p className="text-xs text-vintage-ink-muted">Wants to connect with you</p>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => void handleAccept(req)}
                  className="inline-flex items-center gap-1 rounded-lg bg-vintage-olive/20 px-3 py-2 text-xs font-semibold text-vintage-olive"
                  title="Accept"
                >
                  <Check className="h-4 w-4" /> Accept
                </button>
                <button
                  type="button"
                  onClick={() => void handleDecline(req)}
                  className="rounded-lg bg-vintage-rust/15 p-2 text-vintage-rust"
                  title="Decline"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function ConnectionRequestsEmptyHint() {
  return (
    <p className="flex items-center justify-center gap-2 text-sm text-vintage-ink-muted">
      <UserPlus className="h-4 w-4" />
      Connection requests from other users appear here.
    </p>
  );
}
