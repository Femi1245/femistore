"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";

export function VoiceRecorder({
  onRecorded,
  onCancel,
  disabled,
}: {
  onRecorded: (blob: Blob, durationSeconds: number) => void;
  onCancel: () => void;
  disabled?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    start();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      mediaRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    if (disabled) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const duration = Math.max(1, Math.round((Date.now() - startRef.current) / 1000));
        onRecorded(blob, duration);
      };
      mediaRef.current = recorder;
      startRef.current = Date.now();
      recorder.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } catch {
      onCancel();
    }
  }

  function stop() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    mediaRef.current?.stop();
    setRecording(false);
  }

  if (!recording) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 py-2 text-sm text-vintage-ink-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Starting mic…
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center gap-2 vintage-card-inset px-3 py-2">
      <span className="h-2 w-2 animate-pulse rounded-full bg-vintage-rust" />
      <span className="flex-1 text-sm">Recording {seconds}s…</span>
      <button type="button" onClick={stop} className="vintage-btn flex items-center gap-1 px-3 py-1.5 text-xs">
        <Square className="h-3 w-3" /> Send
      </button>
      <button type="button" onClick={onCancel} className="text-xs text-vintage-ink-muted">
        Cancel
      </button>
    </div>
  );
}
