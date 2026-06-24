"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import type { LiveAREffect } from "@/lib/deepar-config";
import { getAREffectPreviewPath, LIVE_EFFECT_PREVIEW_BASE } from "@/lib/live-effect-previews";
import type { LiveVideoEffect } from "@/lib/live-video-effects";
import { createLiveVideoGLPipeline } from "@/lib/live-video-gl";

const THUMB_SIZE = 56;

let sharedPreviewImage: HTMLImageElement | null = null;
let sharedPreviewPromise: Promise<HTMLImageElement> | null = null;

function loadPreviewBase(): Promise<HTMLImageElement> {
  if (sharedPreviewImage) return Promise.resolve(sharedPreviewImage);
  if (sharedPreviewPromise) return sharedPreviewPromise;

  sharedPreviewPromise = new Promise((resolve, reject) => {
    const img = document.createElement("img");
    img.onload = () => {
      sharedPreviewImage = img;
      resolve(img);
    };
    img.onerror = () => reject(new Error("Could not load effect preview"));
    img.src = LIVE_EFFECT_PREVIEW_BASE;
  });

  return sharedPreviewPromise;
}

export function LiveEffectThumbnail({
  mode,
  effectId,
  label,
  swatch,
  active,
}: {
  mode: "video" | "ar";
  effectId: LiveVideoEffect | LiveAREffect;
  label: string;
  swatch: string;
  active: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (mode !== "video") return;

    let cancelled = false;
    let pipeline: ReturnType<typeof createLiveVideoGLPipeline> | null = null;

    void loadPreviewBase().then((img) => {
      if (cancelled || !canvasRef.current) return;

      const canvas = canvasRef.current;
      canvas.width = THUMB_SIZE;
      canvas.height = THUMB_SIZE;

      pipeline = createLiveVideoGLPipeline(canvas);
      if (!pipeline) return;

      pipeline.renderStill(img, effectId as LiveVideoEffect, 1200);
    });

    return () => {
      cancelled = true;
      pipeline?.destroy();
    };
  }, [mode, effectId]);

  const ringClass = active
    ? "border-vintage-rust ring-2 ring-vintage-rust/40 ring-offset-2 ring-offset-vintage-paper"
    : "border-vintage-border hover:border-vintage-rust/50";

  if (mode === "ar") {
    const src = getAREffectPreviewPath(effectId as LiveAREffect);
    return (
      <span
        className={`relative flex h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 transition ${ringClass}`}
        style={{ background: swatch }}
      >
        <Image
          src={src}
          alt={label}
          width={THUMB_SIZE}
          height={THUMB_SIZE}
          className="h-full w-full object-cover"
          unoptimized
        />
      </span>
    );
  }

  return (
    <span
      className={`relative flex h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 transition ${ringClass}`}
      style={{ background: swatch }}
    >
      <canvas
        ref={canvasRef}
        width={THUMB_SIZE}
        height={THUMB_SIZE}
        className="h-full w-full object-cover"
        aria-hidden
      />
    </span>
  );
}
