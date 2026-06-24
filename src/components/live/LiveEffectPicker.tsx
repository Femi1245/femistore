"use client";

import { useMemo, useState } from "react";
import { Sparkles, Wand2 } from "lucide-react";
import {
  isDeepARConfigured,
  LIVE_AR_EFFECTS,
  type LiveAREffect,
  type LiveEffectMode,
} from "@/lib/deepar-config";
import type { DeepARStatus } from "@/components/live/useDeepARVideoEffect";
import { LiveEffectThumbnail } from "@/components/live/LiveEffectThumbnail";
import {
  LIVE_EFFECT_CATEGORIES,
  LIVE_VIDEO_EFFECTS,
  type LiveEffectCategory,
  type LiveVideoEffect,
} from "@/lib/live-video-effects";

export function LiveEffectPicker({
  mode,
  onModeChange,
  videoEffect,
  onVideoEffectChange,
  arEffect,
  onArEffectChange,
  arStatus,
  arError,
  disabled,
}: {
  mode: LiveEffectMode;
  onModeChange: (mode: LiveEffectMode) => void;
  videoEffect: LiveVideoEffect;
  onVideoEffectChange: (effect: LiveVideoEffect) => void;
  arEffect: LiveAREffect;
  onArEffectChange: (effect: LiveAREffect) => void;
  arStatus?: DeepARStatus;
  arError?: string | null;
  disabled?: boolean;
}) {
  const [category, setCategory] = useState<LiveEffectCategory>("beauty");
  const deepARReady = isDeepARConfigured();

  const filtered = useMemo(
    () => LIVE_VIDEO_EFFECTS.filter((e) => e.category === category),
    [category],
  );

  const activeEffects = mode === "ar" ? LIVE_AR_EFFECTS : filtered;
  const activeValue = mode === "ar" ? arEffect : videoEffect;
  const onActiveChange = mode === "ar" ? onArEffectChange : onVideoEffectChange;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-vintage-rust" />
          <span className="text-sm font-semibold text-vintage-ink">Live effects</span>
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wide text-vintage-ink-muted">
          {mode === "ar" ? "AR lenses" : "Video FX"} · live
        </span>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-0.5">
        <button
          type="button"
          onClick={() => onModeChange("video")}
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition ${
            mode === "video"
              ? "bg-vintage-rust text-on-rust"
              : "bg-vintage-paper-dark text-vintage-ink-muted hover:text-vintage-ink"
          }`}
        >
          <Sparkles className="h-3 w-3" />
          Video FX
        </button>
        <button
          type="button"
          onClick={() => deepARReady && onModeChange("ar")}
          disabled={!deepARReady}
          title={
            deepARReady
              ? "Face-tracking AR lenses"
              : "Add NEXT_PUBLIC_DEEPAR_LICENSE_KEY to enable AR lenses"
          }
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
            mode === "ar"
              ? "bg-vintage-rust text-on-rust"
              : "bg-vintage-paper-dark text-vintage-ink-muted hover:text-vintage-ink"
          }`}
        >
          <Wand2 className="h-3 w-3" />
          AR Lenses
        </button>
      </div>

      {deepARReady && mode === "ar" && arStatus === "loading" && (
        <p className="text-[11px] text-vintage-ink-muted">Loading AR lenses…</p>
      )}
      {deepARReady && mode === "ar" && arStatus === "error" && arError && (
        <p className="text-[11px] leading-snug text-vintage-rust">{arError}</p>
      )}

      {!deepARReady && (
        <p className="text-[11px] leading-snug text-vintage-ink-muted">
          For Snapchat-style face lenses, add a free DeepAR key in{" "}
          <code className="rounded bg-vintage-paper-dark px-1 py-0.5 text-[10px]">
            NEXT_PUBLIC_DEEPAR_LICENSE_KEY
          </code>{" "}
          — get one at{" "}
          <a
            href="https://developer.deepar.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-vintage-rust underline"
          >
            developer.deepar.ai
          </a>
        </p>
      )}

      {mode === "video" && (
        <div className="flex gap-1 overflow-x-auto pb-0.5">
          {LIVE_EFFECT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
                category === cat.id
                  ? "bg-vintage-paper-dark text-vintage-ink ring-1 ring-vintage-border"
                  : "text-vintage-ink-muted hover:text-vintage-ink"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-3 overflow-x-auto pb-1 pt-1">
        {activeEffects.map((effect) => {
          const active = activeValue === effect.id;
          return (
            <button
              key={effect.id}
              type="button"
              disabled={disabled}
              onClick={() => onActiveChange(effect.id as LiveVideoEffect & LiveAREffect)}
              className="flex shrink-0 flex-col items-center gap-1.5 disabled:opacity-50"
              aria-label={effect.label}
              aria-pressed={active}
            >
              <LiveEffectThumbnail
                mode={mode}
                effectId={effect.id}
                label={effect.label}
                swatch={effect.swatch}
                active={active}
              />
              <span
                className={`max-w-[4rem] truncate text-[10px] font-semibold ${
                  active ? "text-vintage-rust" : "text-vintage-ink-muted"
                }`}
              >
                {effect.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
