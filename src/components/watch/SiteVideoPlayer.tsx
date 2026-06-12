"use client";

import {
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  formatVideoTime,
  loadYouTubePlayerApi,
  PLAYER_STATE,
  type YouTubePlayerInstance,
} from "@/lib/youtube-player-api";

type SiteVideoPlayerProps = {
  videoId: string;
  title?: string;
  channelTitle?: string;
  thumbnailUrl?: string;
};

export function SiteVideoPlayer({
  videoId,
  title,
  channelTitle,
  thumbnailUrl,
}: SiteVideoPlayerProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const playerHostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayerInstance | null>(null);
  const tickRef = useRef<number | null>(null);

  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const poster =
    thumbnailUrl ?? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

  const syncPlayerSize = useCallback(() => {
    const stage = stageRef.current;
    const player = playerRef.current;
    if (!stage || !player?.setSize) return;

    const width = stage.clientWidth;
    const height = stage.clientHeight;
    if (width > 0 && height > 0) {
      player.setSize(width, height);
    }
  }, []);

  const stopTick = useCallback(() => {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const startTick = useCallback(() => {
    stopTick();
    tickRef.current = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      setCurrentTime(player.getCurrentTime() || 0);
      const nextDuration = player.getDuration() || 0;
      if (nextDuration > 0) setDuration(nextDuration);
    }, 250);
  }, [stopTick]);

  useEffect(() => {
    let cancelled = false;

    async function mountPlayer() {
      setReady(false);
      setStarted(false);
      setPlaying(false);
      setError(null);
      setCurrentTime(0);
      setDuration(0);

      playerRef.current?.destroy();
      playerRef.current = null;

      if (!playerHostRef.current || !stageRef.current) return;

      const width = stageRef.current.clientWidth || 640;
      const height = stageRef.current.clientHeight || 360;

      try {
        await loadYouTubePlayerApi();
        if (cancelled || !playerHostRef.current) return;

        playerRef.current = new window.YT!.Player(playerHostRef.current, {
          videoId,
          width,
          height,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            enablejsapi: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              playerRef.current = event.target;
              event.target.setVolume(80);
              setVolume(80);
              syncPlayerSize();
              setReady(true);
            },
            onStateChange: (event) => {
              if (cancelled) return;
              const state = event.data;
              setPlaying(state === PLAYER_STATE.PLAYING);
              setBuffering(state === PLAYER_STATE.BUFFERING);
              if (state === PLAYER_STATE.PLAYING) {
                syncPlayerSize();
                startTick();
              } else {
                stopTick();
              }
              if (state === PLAYER_STATE.ENDED) {
                setCurrentTime(event.target.getDuration() || 0);
              }
            },
            onError: () => {
              if (!cancelled) {
                setError("This video could not be played right now.");
              }
            },
          },
        });
      } catch {
        if (!cancelled) {
          setError("The player failed to load. Refresh and try again.");
        }
      }
    }

    mountPlayer();

    return () => {
      cancelled = true;
      stopTick();
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoId, startTick, stopTick, syncPlayerSize]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const observer = new ResizeObserver(() => syncPlayerSize());
    observer.observe(stage);
    return () => observer.disconnect();
  }, [syncPlayerSize, ready]);

  useEffect(() => {
    function onFullscreenChange() {
      setFullscreen(document.fullscreenElement === shellRef.current);
      syncPlayerSize();
    }

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [syncPlayerSize]);

  function togglePlay() {
    const player = playerRef.current;
    if (!player) return;

    if (!started) {
      setStarted(true);
      syncPlayerSize();
      player.playVideo();
      return;
    }

    const state = player.getPlayerState();
    if (state === PLAYER_STATE.PLAYING) player.pauseVideo();
    else player.playVideo();
  }

  function seekToClientX(clientX: number, bar: HTMLDivElement) {
    const player = playerRef.current;
    if (!player || duration <= 0) return;

    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const nextTime = ratio * duration;
    player.seekTo(nextTime, true);
    setCurrentTime(nextTime);
  }

  function toggleMute() {
    const player = playerRef.current;
    if (!player) return;

    if (player.isMuted()) {
      player.unMute();
      setMuted(false);
      if (volume === 0) {
        player.setVolume(80);
        setVolume(80);
      }
    } else {
      player.mute();
      setMuted(true);
    }
  }

  function changeVolume(nextVolume: number) {
    const player = playerRef.current;
    if (!player) return;

    const clamped = Math.min(100, Math.max(0, nextVolume));
    player.setVolume(clamped);
    setVolume(clamped);
    if (clamped === 0) {
      player.mute();
      setMuted(true);
    } else if (muted) {
      player.unMute();
      setMuted(false);
    }
  }

  async function toggleFullscreen() {
    const shell = shellRef.current;
    if (!shell) return;

    if (document.fullscreenElement === shell) {
      await document.exitFullscreen();
    } else {
      await shell.requestFullscreen();
    }
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="vintage-card overflow-hidden">
      <div
        ref={shellRef}
        className={`relative bg-black ${fullscreen ? "flex h-full flex-col justify-center" : ""}`}
      >
        <div ref={stageRef} className="relative aspect-video w-full overflow-hidden bg-black">
          <div
            ref={playerHostRef}
            className="absolute inset-0 z-0 [&>iframe]:absolute [&>iframe]:inset-0 [&>iframe]:h-full [&>iframe]:w-full [&>iframe]:border-0"
          />

          {!started && (
            <button
              type="button"
              onClick={togglePlay}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center"
              aria-label={title ? `Play ${title}` : "Play video"}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={poster}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
                }}
              />
              <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />
              <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-vintage-rust text-[var(--vintage-btn-text)] shadow-xl ring-4 ring-black/20">
                <Play className="h-7 w-7 fill-current pl-1" />
              </span>
              <span className="relative mt-4 rounded-sm bg-black/55 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/90">
                Zumelia Watch
              </span>
            </button>
          )}

          {buffering && started && (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/25">
              <Loader2 className="h-10 w-10 animate-spin text-white/90" />
            </div>
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
              disabled={!ready || Boolean(error)}
              className="flex h-9 w-9 items-center justify-center rounded-sm bg-vintage-rust text-[var(--vintage-btn-text)] disabled:opacity-50"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
            </button>

            <span className="min-w-[5.5rem] text-xs tabular-nums text-vintage-ink-muted">
              {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
            </span>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMute}
                disabled={!ready}
                className="rounded-sm p-2 text-vintage-ink-muted hover:bg-vintage-paper-dark hover:text-vintage-ink disabled:opacity-50"
                aria-label={muted ? "Unmute" : "Mute"}
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
                max={100}
                value={muted ? 0 : volume}
                onChange={(e) => changeVolume(Number(e.target.value))}
                className="hidden w-24 accent-vintage-rust sm:block"
                aria-label="Volume"
              />
              <button
                type="button"
                onClick={toggleFullscreen}
                className="rounded-sm p-2 text-vintage-ink-muted hover:bg-vintage-paper-dark hover:text-vintage-ink"
                aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="border-t border-vintage-border px-4 py-3 text-sm text-vintage-rust">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
