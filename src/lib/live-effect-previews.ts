import type { LiveAREffect } from "@/lib/deepar-config";
import type { LiveVideoEffect } from "@/lib/live-video-effects";

/** Shared portrait used to bake Video FX picker thumbnails (same shaders as live). */
export const LIVE_EFFECT_PREVIEW_BASE = "/live-effects/base.svg";

export const AR_EFFECT_PREVIEW_IMAGES: Record<LiveAREffect, string> = {
  ar_none: "/live-effects/ar/original.svg",
  ar_aviators: "/live-effects/ar/aviators.svg",
  ar_lion: "/live-effects/ar/lion.svg",
  ar_koala: "/live-effects/ar/koala.svg",
  ar_dalmatian: "/live-effects/ar/dalmatian.svg",
  ar_galaxy: "/live-effects/ar/galaxy.svg",
  ar_blur: "/live-effects/ar/blur.svg",
};

export function getVideoEffectPreviewPath(_effect: LiveVideoEffect): string {
  void _effect;
  return LIVE_EFFECT_PREVIEW_BASE;
}

export function getAREffectPreviewPath(effect: LiveAREffect): string {
  return AR_EFFECT_PREVIEW_IMAGES[effect];
}
