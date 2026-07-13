"use client";

import type { LocalVideoTrack } from "livekit-client";
import type { LiveAREffect, LiveEffectMode } from "@/lib/deepar-config";
import { isDeepARConfigured } from "@/lib/deepar-config";
import type { LiveVideoEffect } from "@/lib/live-video-effects";
import { useDeepARVideoEffect, type DeepARStatus } from "@/components/live/useDeepARVideoEffect";
import { useLiveVideoEffect } from "@/components/live/useLiveVideoEffect";

/** Routes live video through WebGL shaders or DeepAR AR lenses (never both). */
export function useLiveStreamEffects(
  track: LocalVideoTrack | undefined,
  mode: LiveEffectMode,
  videoEffect: LiveVideoEffect,
  arEffect: LiveAREffect,
  enabled: boolean,
): { arStatus: DeepARStatus; arError: string | null } {
  // Keep the raw LiveKit camera until the host picks a real effect.
  // Replacing for "none"/"ar_none" caused mute-on-cleanup and left the camera off.
  const videoEnabled = enabled && mode === "video" && videoEffect !== "none";
  const arEnabled =
    enabled &&
    mode === "ar" &&
    arEffect !== "ar_none" &&
    isDeepARConfigured();

  useLiveVideoEffect(track, videoEffect, videoEnabled);
  const { status: arStatus, error: arError } = useDeepARVideoEffect(
    track,
    arEffect,
    arEnabled,
  );

  return { arStatus, arError };
}
