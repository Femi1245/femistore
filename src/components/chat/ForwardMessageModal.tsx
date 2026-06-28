"use client";

import { conversationLabel } from "@/lib/chat";
import type { ConversationPreview } from "@/lib/types";
import { Avatar } from "@/components/Avatar";

export function ForwardMessageModal({
  conversations,
  currentConversationId,
  preview,
  onClose,
  onSelect,
}: {
  conversations: ConversationPreview[];
  currentConversationId: string;
  preview: string;
  onClose: () => void;
  onSelect: (conversationId: string) => void;
}) {
  const targets = conversations.filter(
    (c) => c.id !== currentConversationId && c.kind !== "channel",
  );

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[70vh] w-full max-w-md overflow-hidden rounded-t-2xl bg-vintage-paper shadow-xl md:rounded-2xl">
        <div className="border-b border-vintage-border px-4 py-3">
          <h3 className="font-display text-lg font-semibold text-vintage-ink">Forward to</h3>
          <p className="mt-1 line-clamp-2 text-xs text-vintage-ink-muted">{preview}</p>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {targets.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-vintage-ink-muted">
              No other chats to forward to yet.
            </p>
          ) : (
            targets.map((conv) => (
              <button
                key={conv.id}
                type="button"
                onClick={() => onSelect(conv.id)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-vintage-paper-dark/60"
              >
                <Avatar
                  name={conversationLabel(conv)}
                  avatarUrl={conv.other_user?.avatar_url ?? null}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-vintage-ink">{conversationLabel(conv)}</p>
                  <p className="truncate text-xs text-vintage-ink-muted">
                    {conv.kind === "group" ? "Group" : "Direct message"}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
