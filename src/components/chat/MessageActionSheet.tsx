"use client";

import {
  Copy,
  Forward,
  Languages,
  Pencil,
  Reply,
  Trash2,
  UserX,
  Users,
  X,
} from "lucide-react";
import type { Message } from "@/lib/types";

export type MessageActionId =
  | "reply"
  | "copy"
  | "edit"
  | "translate"
  | "forward"
  | "delete_me"
  | "delete_everyone";

export type MessageActionItem = {
  id: MessageActionId;
  label: string;
  icon: typeof Reply;
  destructive?: boolean;
};

type Props = {
  message: Message;
  isMine: boolean;
  canEdit: boolean;
  canDeleteForEveryone: boolean;
  onAction: (action: MessageActionId) => void;
  onClose: () => void;
};

export function MessageActionSheet({
  message,
  isMine,
  canEdit,
  canDeleteForEveryone,
  onAction,
  onClose,
}: Props) {
  const isText = !message.message_type || message.message_type === "text";
  const isDeleted = !!message.deleted_at;

  const actions: MessageActionItem[] = [];

  if (isText && !isDeleted) {
    actions.push({ id: "reply", label: "Reply", icon: Reply });
    actions.push({ id: "copy", label: "Copy", icon: Copy });
    actions.push({ id: "translate", label: "Translate", icon: Languages });
    actions.push({ id: "forward", label: "Forward", icon: Forward });
    if (canEdit) {
      actions.push({ id: "edit", label: "Edit", icon: Pencil });
    }
    actions.push({ id: "delete_me", label: "Delete for me", icon: UserX, destructive: true });
    if (isMine && canDeleteForEveryone) {
      actions.push({
        id: "delete_everyone",
        label: "Delete for everyone",
        icon: Users,
        destructive: true,
      });
    }
  } else if (!isDeleted) {
    actions.push({ id: "delete_me", label: "Delete for me", icon: Trash2, destructive: true });
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md animate-in slide-in-from-bottom duration-200 md:rounded-2xl"
      >
        <div className="mx-3 mb-3 max-h-[40vh] overflow-hidden rounded-2xl bg-vintage-paper shadow-xl md:mx-0">
          <div className="border-b border-vintage-border px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-vintage-ink-muted">
              Message
            </p>
            <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-vintage-ink">
              {message.content}
            </p>
          </div>
          <ul className="max-h-[50vh] overflow-y-auto py-1">
            {actions.map(({ id, label, icon: Icon, destructive }) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onAction(id)}
                  className={`flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium transition hover:bg-vintage-paper-dark/60 active:bg-vintage-rust/10 ${
                    destructive ? "text-vintage-rust" : "text-vintage-ink"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mx-3 mb-[max(0.75rem,env(safe-area-inset-bottom))] flex w-[calc(100%-1.5rem)] items-center justify-center gap-2 rounded-2xl bg-vintage-paper py-3.5 text-sm font-semibold text-vintage-ink shadow-lg md:mx-0 md:mb-0 md:w-full"
        >
          <X className="h-4 w-4" /> Cancel
        </button>
      </div>
    </div>
  );
}
