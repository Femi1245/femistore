"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mic2, Radio } from "lucide-react";
import { LiveSetupNotice } from "@/components/live/LiveSetupNotice";
import { LiveStreamList } from "@/components/live/LiveStreamList";
import { VoiceRoomList } from "@/components/voice/VoiceRoomList";
import { SectionTipBanner } from "@/components/layout/SectionTipBanner";

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
      <header className="editorial-masthead flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="editorial-eyebrow">Broadcast</p>
          <h1 className="editorial-title">Live</h1>
          <p className="editorial-lead">
            {tab === "video"
              ? "Stage-worthy video with real-time effects — not another scroll."
              : "Intimate audio lounges when camera is too much."}
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
      </header>

      <SectionTipBanner section="live" />

      <div className="editorial-segmented w-full sm:w-auto">
        <button
          type="button"
          onClick={() => setTab("video")}
          className={`editorial-segmented-btn flex flex-1 items-center justify-center gap-2 sm:flex-initial ${
            tab === "video" ? "editorial-segmented-btn-active" : ""
          }`}
        >
          <Radio className="h-4 w-4" />
          Video live
        </button>
        <button
          type="button"
          onClick={() => setTab("voice")}
          className={`editorial-segmented-btn flex flex-1 items-center justify-center gap-2 sm:flex-initial ${
            tab === "voice" ? "editorial-segmented-btn-active" : ""
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
