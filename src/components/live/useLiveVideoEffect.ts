"use client";

import { useEffect, useRef } from "react";
import type { LocalVideoTrack } from "livekit-client";
import type { LiveVideoEffect } from "@/lib/live-video-effects";
import {
  createLiveVideoGLPipeline,
  startVideoFrameLoop,
} from "@/lib/live-video-gl";

/**
 * TikTok-style real-time video pipeline:
 * - WebGL GPU shaders per frame (not CSS/photo filters)
 * - Synced to camera frames via requestVideoFrameCallback
 * - Effect switches update a ref only — camera never pauses
 */
export function useLiveVideoEffect(
  track: LocalVideoTrack | undefined,
  effect: LiveVideoEffect,
  enabled: boolean,
) {
  const effectRef = useRef(effect);
  effectRef.current = effect;

  const pipelineActiveRef = useRef(false);

  useEffect(() => {
    effectRef.current = effect;
  }, [effect]);

  useEffect(() => {
    if (!enabled || !track) return;

    const original = track.mediaStreamTrack;
    let cancelled = false;
    let outputTrack: MediaStreamTrack | null = null;
    let stopLoop: (() => void) | null = null;

    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.srcObject = new MediaStream([original]);

    const canvas = document.createElement("canvas");
    const glPipeline = createLiveVideoGLPipeline(canvas);
    const ctx2d = glPipeline ? null : canvas.getContext("2d", { alpha: false });

    const start = async () => {
      try {
        await video.play();
      } catch {
        // Track may need a moment to produce frames
      }
      if (cancelled) return;

      stopLoop = startVideoFrameLoop(video, (timeMs) => {
        if (glPipeline) {
          glPipeline.render(video, effectRef.current, timeMs);
        } else if (ctx2d && video.videoWidth > 0) {
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }
          ctx2d.drawImage(video, 0, 0);
        }
      });

      const fps = 60;
      const stream = canvas.captureStream(fps);
      outputTrack = stream.getVideoTracks()[0];
      if (!outputTrack || cancelled) return;

      try {
        await track.replaceTrack(outputTrack, true);
        pipelineActiveRef.current = true;
      } catch {
        pipelineActiveRef.current = false;
      }
    };

    void start();

    return () => {
      cancelled = true;
      stopLoop?.();
      video.pause();
      video.srcObject = null;
      outputTrack?.stop();
      glPipeline?.destroy();

      if (pipelineActiveRef.current) {
        void track.replaceTrack(original, true).catch(() => undefined);
        pipelineActiveRef.current = false;
      }
    };
  }, [track, enabled]);
}
