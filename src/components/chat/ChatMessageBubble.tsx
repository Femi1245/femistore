"use client";

import { Check, CheckCheck, DollarSign, Pencil, Reply, X } from "lucide-react";
import { useCallback } from "react";
import { VoiceMessageBubble } from "@/components/chat/VoiceMessageBubble";
import { PollMessage } from "@/components/chat/PollMessage";
import { ReplyQuote } from "@/components/chat/ReplyQuote";
import { useLongPress } from "@/components/chat/useLongPress";
import { formatMessageTime } from "@/lib/chat";
import { DELETED_MESSAGE_PLACEHOLDER } from "@/lib/message-actions";
import type { ActiveChat, Message, Profile } from "@/lib/types";

type Props = {
  msg: Message;
  isMine: boolean;
  currentUserId: string;
  activeChat: ActiveChat;
  sender?: Profile;
  canEditMsg: boolean;
  isEditing: boolean;
  editMessageDraft: string;
  messageEditError: string | null;
  savingMessageEdit: boolean;
  translation?: string;
  showTranslation: boolean;
  onLongPress: (msg: Message) => void;
  onStartEdit: (msg: Message) => void;
  onSaveEdit: (messageId: string, createdAt: string) => void;
  onCancelEdit: () => void;
  onEditDraftChange: (value: string) => void;
  onReply: (msg: Message) => void;
  /** DM read receipt: other person read up to this message. */
  isRead?: boolean;
  showReadReceipt?: boolean;
};

export function ChatMessageBubble({
  msg,
  isMine,
  currentUserId,
  activeChat,
  sender,
  canEditMsg,
  isEditing,
  editMessageDraft,
  messageEditError,
  savingMessageEdit,
  translation,
  showTranslation,
  onLongPress,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditDraftChange,
  onReply,
  isRead = false,
  showReadReceipt = false,
}: Props) {
  const isText = !msg.message_type || msg.message_type === "text";
  const isDeleted = !!msg.deleted_at;

  const handleLongPress = useCallback(() => {
    onLongPress(msg);
  }, [msg, onLongPress]);

  const { handlers: longPressHandlers } = useLongPress(handleLongPress);

  return (
    <div
      id={`msg-${msg.id}`}
      className={`group flex ${isMine ? "justify-end" : "justify-start"}`}
    >
      <div
        {...longPressHandlers}
        className={`max-w-[85%] select-none rounded-2xl px-4 py-2.5 md:max-w-[75%] md:select-text ${
          isMine
            ? "rounded-br-sm vintage-btn text-on-rust"
            : "rounded-bl-sm vintage-card-inset text-vintage-ink"
        } ${isDeleted ? "opacity-75" : ""}`}
      >
        {!isMine && activeChat.kind !== "dm" && (
          <p className="mb-1 text-[10px] font-semibold text-vintage-rust">
            {sender?.display_name ?? "Member"}
          </p>
        )}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editMessageDraft}
              onChange={(e) => onEditDraftChange(e.target.value)}
              rows={2}
              className="vintage-input w-full resize-none px-2 py-1.5 text-sm text-vintage-ink"
            />
            {messageEditError && (
              <p className="text-[10px] text-vintage-rust">{messageEditError}</p>
            )}
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => onSaveEdit(msg.id, msg.created_at)}
                disabled={savingMessageEdit || !editMessageDraft.trim()}
                className="flex items-center gap-1 rounded-lg bg-black/20 px-2 py-1 text-[10px] font-semibold text-on-rust disabled:opacity-50"
              >
                <Check className="h-3 w-3" /> Save
              </button>
              <button
                type="button"
                onClick={onCancelEdit}
                className="flex items-center gap-1 rounded-lg bg-black/10 px-2 py-1 text-[10px] text-on-rust"
              >
                <X className="h-3 w-3" /> Cancel
              </button>
            </div>
          </div>
        ) : msg.message_type === "voice" && msg.media_url ? (
          <VoiceMessageBubble
            url={msg.media_url}
            durationSeconds={msg.media_duration_seconds}
            isMine={isMine}
          />
        ) : msg.message_type === "call_log" ? (
          <p className="text-sm italic opacity-90">{msg.content}</p>
        ) : msg.message_type === "gift" ? (
          <p className="text-sm font-medium">{msg.content}</p>
        ) : msg.message_type === "payment" ? (
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <DollarSign className="h-4 w-4 shrink-0" />
            {msg.content}
          </p>
        ) : msg.message_type === "poll" && msg.poll_id ? (
          <PollMessage pollId={msg.poll_id} userId={currentUserId} />
        ) : (
          <div className="flex flex-col gap-1.5">
            {msg.reply_to && !isDeleted && (
              <ReplyQuote
                muted={isMine}
                label={
                  msg.reply_to.sender?.display_name ??
                  (msg.reply_to.sender_id === currentUserId ? "You" : "Message")
                }
                content={msg.reply_to.content}
                onClick={() =>
                  document
                    .getElementById(`msg-${msg.reply_to!.id}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "center" })
                }
              />
            )}
            <p
              className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${
                isDeleted ? "italic opacity-80" : ""
              }`}
            >
              {isDeleted ? DELETED_MESSAGE_PLACEHOLDER : msg.content}
            </p>
            {!isMine && showTranslation && translation && translation !== msg.content && (
              <p className="border-t border-vintage-border/40 pt-2 text-xs italic text-vintage-ink-muted">
                {translation}
              </p>
            )}
          </div>
        )}
        <div
          className={`mt-1 flex items-center gap-2 text-[10px] ${
            isMine ? "text-on-rust-muted" : "text-vintage-ink-muted"
          }`}
        >
          <span>
            {formatMessageTime(msg.created_at)}
            {msg.edited_at ? " · edited" : ""}
          </span>
          {isMine && showReadReceipt && !isDeleted && (
            <span
              className={`inline-flex items-center gap-0.5 ${
                isRead ? "text-white/90" : "text-white/60"
              }`}
              title={isRead ? "Read" : "Sent"}
            >
              {isRead ? (
                <CheckCheck className="h-3 w-3" aria-label="Read" />
              ) : (
                <Check className="h-3 w-3" aria-label="Sent" />
              )}
            </span>
          )}
          {canEditMsg && !isEditing && (
            <button
              type="button"
              onClick={() => onStartEdit(msg)}
              className={`hidden items-center gap-0.5 opacity-0 transition group-hover:opacity-100 md:flex ${
                isMine ? "hover:text-white" : "hover:text-vintage-rust"
              }`}
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
          )}
          {isText && !isEditing && !isDeleted && (
            <button
              type="button"
              onClick={() => onReply(msg)}
              className={`hidden items-center gap-0.5 opacity-0 transition group-hover:opacity-100 md:flex ${
                isMine ? "hover:text-white" : "hover:text-vintage-rust"
              }`}
            >
              <Reply className="h-3 w-3" /> Reply
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
