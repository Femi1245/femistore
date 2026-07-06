"use client";

import {
  Maximize,
  Minimize,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatVideoTime } from "@/lib/youtube-player-api";

export function NativeVideoPlayer({
  src,
  title,
  channelTitle,
  poster,
}: {
  src: string;
  title?: string;
  channelTitle?: string;
  poster?: string | null;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    function onFullscreenChange() {
      setFullscreen(document.fullscreenElement === shellRef.current);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  function togglePlay() {
    const el = videoRef.current;
    if (!el) return;
    if (!started) setStarted(true);
    if (el.paused) void el.play();
    else el.pause();
  }

  function seekToClientX(clientX: number, bar: HTMLDivElement) {
    const el = videoRef.current;
    if (!el || duration <= 0) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    el.currentTime = ratio * duration;
  }

  async function toggleFullscreen() {
    const shell = shellRef.current;
    if (!shell) return;
    if (document.fullscreenElement === shell) await document.exitFullscreen();
    else await shell.requestFullscreen();
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="vintage-card overflow-hidden">
      <div ref={shellRef} className="relative bg-black">
        <div className="relative aspect-video w-full overflow-hidden bg-black">
          <video
            ref={videoRef}
            src={src}
            poster={poster ?? undefined}
            className="absolute inset-0 h-full w-full bg-black object-contain"
            playsInline
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
          />

          {!started && (
            <button
              type="button"
              onClick={togglePlay}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/35"
              aria-label={title ? `Play ${title}` : "Play video"}
            >
              <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-vintage-rust text-[var(--vintage-btn-text)] shadow-xl ring-4 ring-black/20">
                <Play className="h-7 w-7 fill-current pl-1" />
              </span>
              <span className="relative mt-4 rounded-sm bg-black/55 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/90">
                Zumelia Watch
              </span>
            </button>
          )}
        </div>

        <div className="border-t border-vintage-border bg-vintage-paper px-3 py-3 sm:px-4">
          {(title || channelTitle) && (
            <div className="mb-3 hidden sm:block">
              {title && (
                <p className="line-clamp-1 font-display text-sm font-semibold text-vintage-ink">
                  {title}
                </p>
              )}
              {channelTitle && (
                <p className="text-xs text-vintage-ink-muted">{channelTitle}</p>
              )}
            </div>
          )}

          <div
            className="mb-3 h-1.5 cursor-pointer rounded-full bg-vintage-paper-dark"
            onClick={(e) => seekToClientX(e.clientX, e.currentTarget)}
            role="slider"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={currentTime}
            tabIndex={0}
          >
            <div
              className="h-full rounded-full bg-vintage-rust transition-[width] duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              className="flex h-9 w-9 items-center justify-center rounded-sm bg-vintage-rust text-[var(--vintage-btn-text)]"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
            </button>

            <span className="min-w-[5.5rem] text-xs tabular-nums text-vintage-ink-muted">
              {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
            </span>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const el = videoRef.current;
                  if (!el) return;
                  el.muted = !el.muted;
                  setMuted(el.muted);
                }}
                className="rounded-sm p-2 text-vintage-ink-muted hover:bg-vintage-paper-dark hover:text-vintage-ink"
              >
                {muted || volume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => {
                  const el = videoRef.current;
                  if (!el) return;
                  const next = Number(e.target.value);
                  el.volume = next;
                  setVolume(next);
                  if (next > 0) {
                    el.muted = false;
                    setMuted(false);
                  }
                }}
                className="hidden w-24 accent-vintage-rust sm:block"
              />
              <button
                type="button"
                onClick={toggleFullscreen}
                className="rounded-sm p-2 text-vintage-ink-muted hover:bg-vintage-paper-dark hover:text-vintage-ink"
              >
                {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
