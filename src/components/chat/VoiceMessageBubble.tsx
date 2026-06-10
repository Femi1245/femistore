"use client";

import { useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

export function VoiceMessageBubble({
  url,
  durationSeconds,
  isMine,
}: {
  url: string;
  durationSeconds: number | null;
  isMine: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  function toggle() {
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`flex items-center gap-2 rounded-full px-3 py-2 ${
        isMine ? "bg-white/15" : "bg-vintage-paper-dark/50"
      }`}
    >
      {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      <span className="text-xs font-medium">
        {durationSeconds ? `${durationSeconds}s` : "Voice"}
      </span>
      <span className="text-[10px] opacity-70">voicemail</span>
    </button>
  );
}
