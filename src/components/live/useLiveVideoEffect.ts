"use client";

import { useEffect, useRef } from "react";
import type { LocalVideoTrack } from "livekit-client";
import type { LiveVideoEffect } from "@/lib/live-video-effects";
import {
  createLiveVideoGLPipeline,
  startVideoFrameLoop,
} from "@/lib/live-video-gl";

async function waitForVideoFrames(
  video: HTMLVideoElement,
  timeoutMs = 5000,
): Promise<void> {
  if (video.videoWidth > 0 && video.videoHeight > 0) return;

  await new Promise<void>((resolve) => {
    const done = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        cleanup();
        resolve();
      }
    };
    const timer = window.setTimeout(() => {
      cleanup();
      resolve();
    }, timeoutMs);
    const cleanup = () => {
      video.removeEventListener("loadeddata", done);
      video.removeEventListener("loadedmetadata", done);
      video.removeEventListener("resize", done);
      window.clearTimeout(timer);
    };
    video.addEventListener("loadeddata", done);
    video.addEventListener("loadedmetadata", done);
    video.addEventListener("resize", done);
    done();
  });
}

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
      await waitForVideoFrames(video);
      if (cancelled || video.videoWidth <= 0) return;

      if (!glPipeline) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      stopLoop = startVideoFrameLoop(video, (timeMs) => {
        if (glPipeline) {
          glPipeline.render(video, effectRef.current, timeMs);
        } else if (ctx2d && video.videoWidth > 0) {
          if (
            canvas.width !== video.videoWidth ||
            canvas.height !== video.videoHeight
          ) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }
          ctx2d.drawImage(video, 0, 0);
        }
      });

      // Draw at least one frame before publishing the canvas track.
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      if (cancelled) return;

      const stream = canvas.captureStream(60);
      outputTrack = stream.getVideoTracks()[0] ?? null;
      if (!outputTrack || cancelled) return;

      try {
        // userProvided=true so LiveKit does not stop our canvas track.
        await track.replaceTrack(outputTrack, true);
        pipelineActiveRef.current = true;
      } catch {
        pipelineActiveRef.current = false;
        outputTrack.stop();
        outputTrack = null;
      }
    };

    void start();

    return () => {
      cancelled = true;
      stopLoop?.();
      video.pause();
      video.srcObject = null;
      glPipeline?.destroy();

      const canvasTrack = outputTrack;
      const wasActive = pipelineActiveRef.current;
      pipelineActiveRef.current = false;

      if (wasActive) {
        // Restore SDK-managed camera BEFORE stopping the canvas track.
        // Stopping first muted the published track permanently.
        void track
          .replaceTrack(original, false)
          .then(() => {
            // If the original camera track died while the pipeline ran,
            // reacquire a fresh one so the camera doesn't stay black/off.
            if (original.readyState === "ended") return track.restartTrack();
          })
          .catch(() => undefined)
          .finally(() => canvasTrack?.stop());
      } else {
        canvasTrack?.stop();
      }
    };
  }, [track, enabled]);
}
