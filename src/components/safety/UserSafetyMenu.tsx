"use client";

import { useState } from "react";
import { Ban, Flag, MoreHorizontal, VolumeX } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { blockUser, muteUser, unblockUser, unmuteUser } from "@/lib/safety";
import { ReportModal } from "@/components/safety/ReportModal";
import type { Profile } from "@/lib/types";

export function UserSafetyMenu({
  profile,
  currentUserId,
  onBlocked,
}: {
  profile: Profile;
  currentUserId: string;
  onBlocked?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [muted, setMuted] = useState(false);
  const [busy, setBusy] = useState(false);

  if (profile.id === currentUserId) return null;

  async function toggleBlock() {
    setBusy(true);
    const supabase = createClient();
    const next = !blocked;
    const { error } = next
      ? await blockUser(supabase, currentUserId, profile.id)
      : await unblockUser(supabase, currentUserId, profile.id);
    setBusy(false);
    if (!error) {
      setBlocked(next);
      if (next) onBlocked?.();
    }
    setOpen(false);
  }

  async function toggleMute() {
    setBusy(true);
    const supabase = createClient();
    const next = !muted;
    const { error } = next
      ? await muteUser(supabase, currentUserId, profile.id)
      : await unmuteUser(supabase, currentUserId, profile.id);
    setBusy(false);
    if (!error) setMuted(next);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg p-2 text-vintage-ink-muted hover:bg-vintage-paper-dark hover:text-vintage-ink"
        aria-label="Safety options"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          />
          <div className="absolute right-0 z-40 mt-1 w-48 vintage-card py-1 shadow-lg">
            <button
              type="button"
              disabled={busy}
              onClick={() => void toggleMute()}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-vintage-ink hover:bg-vintage-paper-dark"
            >
              <VolumeX className="h-4 w-4" />
              {muted ? "Unmute posts" : "Mute posts"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void toggleBlock()}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-vintage-rust hover:bg-vintage-paper-dark"
            >
              <Ban className="h-4 w-4" />
              {blocked ? "Unblock" : "Block"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setReportOpen(true);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-vintage-ink hover:bg-vintage-paper-dark"
            >
              <Flag className="h-4 w-4" />
              Report
            </button>
          </div>
        </>
      )}
      {reportOpen && (
        <ReportModal
          targetType="user"
          targetId={profile.id}
          targetLabel={profile.display_name}
          onClose={() => setReportOpen(false)}
        />
      )}
    </div>
  );
}
