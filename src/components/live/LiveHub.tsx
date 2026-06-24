"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mic2, Radio } from "lucide-react";
import { LiveSetupNotice } from "@/components/live/LiveSetupNotice";
import { LiveStreamList } from "@/components/live/LiveStreamList";
import { VoiceRoomList } from "@/components/voice/VoiceRoomList";

type LiveTab = "video" | "voice";

export function LiveHub() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [tab, setTab] = useState<LiveTab>(tabParam === "voice" ? "voice" : "video");

  useEffect(() => {
    if (tabParam === "voice") setTab("voice");
    else if (tabParam === "video") setTab("video");
  }, [tabParam]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-vintage-ink">Live</h1>
          <p className="text-sm text-vintage-ink-muted">
            {tab === "video"
              ? "Watch live video from people around the world"
              : "Audio-only hangouts — talk without camera pressure"}
          </p>
        </div>
        {tab === "video" ? (
          <Link href="/live/go-live" className="vintage-btn px-5 py-2.5 text-sm">
            Go live
          </Link>
        ) : (
          <Link href="/voice/start" className="vintage-btn px-5 py-2.5 text-sm">
            Start lounge
          </Link>
        )}
      </div>

      <div className="flex gap-1 vintage-card-inset p-1">
        <button
          type="button"
          onClick={() => setTab("video")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
            tab === "video"
              ? "bg-vintage-rust text-on-rust"
              : "text-vintage-ink-muted hover:text-vintage-ink"
          }`}
        >
          <Radio className="h-4 w-4" />
          Video live
        </button>
        <button
          type="button"
          onClick={() => setTab("voice")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
            tab === "voice"
              ? "bg-vintage-rust text-on-rust"
              : "text-vintage-ink-muted hover:text-vintage-ink"
          }`}
        >
          <Mic2 className="h-4 w-4" />
          Voice lounges
        </button>
      </div>

      <LiveSetupNotice />
      {tab === "video" ? <LiveStreamList /> : <VoiceRoomList />}
    </div>
  );
}
