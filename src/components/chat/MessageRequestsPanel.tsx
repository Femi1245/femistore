"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { loadPendingRequests, respondToRequest } from "@/lib/message-requests";
import { conversationLabel } from "@/lib/chat";
import type { DmRequest } from "@/lib/types";
import { Avatar } from "@/components/Avatar";

export function MessageRequestsPanel({
  userId,
  onOpenConversation,
  onRefresh,
}: {
  userId: string;
  onOpenConversation: (convId: string) => void;
  onRefresh: () => void;
}) {
  const [requests, setRequests] = useState<DmRequest[]>([]);

  const refresh = useCallback(async () => {
    const rows = await loadPendingRequests(createClient(), userId);
    setRequests(rows);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleRespond(id: string, accept: boolean) {
    await respondToRequest(createClient(), id, userId, accept);
    await refresh();
    onRefresh();
  }

  if (!requests.length) {
    return (
      <p className="px-4 py-12 text-center text-sm text-vintage-ink-muted">
        No message requests. Strangers who message you (when your DM policy allows) appear here.
      </p>
    );
  }

  return (
    <div className="space-y-1 p-2">
      {requests.map((req) => (
        <div
          key={req.id}
          className="flex items-center gap-3 rounded-xl vintage-card-inset p-3"
        >
          <Avatar
            name={req.from_user?.display_name ?? "User"}
            avatarUrl={req.from_user?.avatar_url ?? null}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-vintage-ink">
              {req.from_user ? conversationLabel({
                id: req.conversation_id,
                kind: "dm",
                name: null,
                other_user: req.from_user,
                last_message: null,
                last_message_at: null,
              }) : "Unknown"}
            </p>
            <p className="truncate text-xs text-vintage-ink-muted">{req.preview}</p>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => void handleRespond(req.id, true).then(() => onOpenConversation(req.conversation_id))}
              className="inline-flex items-center gap-1 rounded-lg bg-vintage-olive/20 px-3 py-2 text-xs font-semibold text-vintage-olive"
              title="Accept"
            >
              <Check className="h-4 w-4" /> Accept
            </button>
            <button
              type="button"
              onClick={() => void handleRespond(req.id, false)}
              className="rounded-lg bg-vintage-rust/15 p-2 text-vintage-rust"
              title="Decline"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
