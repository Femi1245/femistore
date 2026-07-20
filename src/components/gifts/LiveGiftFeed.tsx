"use client";

import { useEffect, useState } from "react";
import { Gift } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { loadLiveGifts } from "@/lib/gifts";
import type { Profile, SentGift } from "@/lib/types";

export function LiveGiftFeed({
  roomName,
  host,
  currentUser,
  onSendGift,
}: {
  roomName: string;
  host: Profile;
  currentUser: Profile;
  onSendGift: () => void;
}) {
  const [gifts, setGifts] = useState<SentGift[]>([]);

  useEffect(() => {
    async function refresh() {
      const list = await loadLiveGifts(createClient(), roomName);
      setGifts(list);
    }
    refresh();

    const channel = createClient()
      .channel(`live-gifts:${roomName}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sent_gifts",
          filter: `room_name=eq.${roomName}`,
        },
        async () => {
          const list = await loadLiveGifts(createClient(), roomName, 10);
          setGifts(list);
        },
      )
      .subscribe();

    return () => {
      createClient().removeChannel(channel);
    };
  }, [roomName]);

  return (
    <div className="flex flex-col overflow-hidden bg-vintage-paper">
      <div className="flex items-center justify-between border-b border-vintage-border px-3 py-2">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-vintage-rust" />
          <h3 className="font-display text-sm font-bold">Live gifts</h3>
        </div>
        {currentUser.id !== host.id && (
          <button
            type="button"
            onClick={onSendGift}
            className="vintage-btn px-2 py-1 text-xs"
          >
            Send gift
          </button>
        )}
      </div>
      <div className="max-h-32 space-y-1 overflow-y-auto px-3 py-2">
        {gifts.length === 0 ? (
          <p className="py-4 text-center text-xs text-vintage-ink-muted">
            Be the first to send {host.display_name} a gift!
          </p>
        ) : (
          gifts.map((g) => (
            <div key={g.id} className="flex items-center gap-2 text-xs">
              <span className="text-lg">{g.catalog?.emoji ?? "🎁"}</span>
              <span className="min-w-0 flex-1 truncate">
                <strong>{g.sender?.display_name ?? "Someone"}</strong>
                {" sent "}
                {g.catalog?.name ?? "a gift"}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
