"use client";

import { Plus } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import type { Profile } from "@/lib/types";

export function StatusRing({
  user,
  hasUnseen,
  hasStatus,
  isOwn,
  onClick,
}: {
  user: Profile;
  hasUnseen: boolean;
  hasStatus: boolean;
  isOwn: boolean;
  onClick: () => void;
}) {
  const ringClass = hasStatus
    ? hasUnseen
      ? "bg-gradient-to-tr from-vintage-rust via-vintage-mustard to-vintage-olive"
      : "bg-vintage-border"
    : "bg-vintage-border/70";

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5"
    >
      <div className={`rounded-full p-[2px] ${ringClass}`}>
        <div className="relative rounded-full bg-vintage-paper p-[2px]">
          <Avatar name={user.display_name} avatarUrl={user.avatar_url} size="lg" />
          {isOwn && !hasStatus && (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-vintage-paper bg-vintage-rust text-[var(--vintage-btn-text)]">
              <Plus className="h-3 w-3" />
            </span>
          )}
        </div>
      </div>
      <span className="max-w-[4.5rem] truncate text-[10px] font-semibold text-vintage-ink-muted group-hover:text-vintage-ink">
        {isOwn ? "Your status" : user.display_name.split(" ")[0]}
      </span>
    </button>
  );
}
