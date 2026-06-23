"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isCloseFriend, toggleCloseFriend } from "@/lib/close-friends";
import { areMutualFriends } from "@/lib/chat";

export function CloseFriendButton({
  currentUserId,
  profileId,
}: {
  currentUserId: string;
  profileId: string;
}) {
  const [close, setClose] = useState(false);
  const [mutual, setMutual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void areMutualFriends(supabase, currentUserId, profileId).then(setMutual);
    void isCloseFriend(supabase, currentUserId, profileId).then(setClose);
  }, [currentUserId, profileId]);

  if (!mutual) return null;

  async function handleToggle() {
    setLoading(true);
    setError(null);
    const { isClose: next, error: err } = await toggleCloseFriend(
      createClient(),
      currentUserId,
      profileId,
    );
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    setClose(next);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void handleToggle()}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${
          close
            ? "border-vintage-rust bg-vintage-rust/10 text-vintage-rust"
            : "border-vintage-border text-vintage-ink-muted hover:bg-vintage-paper-dark"
        }`}
      >
        <Star className={`h-3.5 w-3.5 ${close ? "fill-vintage-rust" : ""}`} />
        {close ? "Close friend" : "Add close friend"}
      </button>
      {error && <p className="mt-1 text-xs text-vintage-rust">{error}</p>}
    </div>
  );
}
