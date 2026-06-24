"use client";

import { useEffect, useRef, useState } from "react";
import type { LocalVideoTrack } from "livekit-client";
import type { DeepAR } from "deepar";
import {
  DEEPAR_ROOT_PATH,
  getDeepAREffectUrl,
  isDeepARConfigured,
  type LiveAREffect,
} from "@/lib/deepar-config";

export type DeepARStatus = "idle" | "loading" | "ready" | "error";

async function waitForVideoFrames(video: HTMLVideoElement, timeoutMs = 5000): Promise<void> {
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

function sizeCanvasForVideo(canvas: HTMLCanvasElement, video: HTMLVideoElement) {
  const width = video.videoWidth || 640;
  const height = video.videoHeight || 480;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
}

async function waitForNextFrames(count = 2): Promise<void> {
  for (let i = 0; i < count; i++) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
}

async function applyDeepAREffect(deepAR: DeepAR, effect: LiveAREffect): Promise<void> {
  deepAR.clearEffect();
  if (effect === "ar_none") return;

  const url = getDeepAREffectUrl(effect);
  if (url) await deepAR.switchEffect(url);
}

/**
 * DeepAR face lenses — feeds processed canvas into LiveKit.
 */
export function useDeepARVideoEffect(
  track: LocalVideoTrack | undefined,
  effect: LiveAREffect,
  enabled: boolean,
): { status: DeepARStatus; error: string | null } {
  const effectRef = useRef(effect);
  effectRef.current = effect;

  const deepARRef = useRef<DeepAR | null>(null);
  const pipelineActiveRef = useRef(false);
  const [status, setStatus] = useState<DeepARStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    effectRef.current = effect;
  }, [effect]);

  useEffect(() => {
    if (!enabled || !track || !isDeepARConfigured()) {
      setStatus("idle");
      setError(null);
      return;
    }

    const licenseKey = process.env.NEXT_PUBLIC_DEEPAR_LICENSE_KEY!;
    const original = track.mediaStreamTrack;
    let cancelled = false;
    let outputTrack: MediaStreamTrack | null = null;
    let deepAR: DeepAR | null = null;

    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.setAttribute("playsinline", "true");
    video.srcObject = new MediaStream([original]);

    const canvas = document.createElement("canvas");
    canvas.style.display = "block";

    setStatus("loading");
    setError(null);

    const start = async () => {
      try {
        await video.play();
        await waitForVideoFrames(video);
        if (cancelled) return;

        sizeCanvasForVideo(canvas, video);

        const deepar = await import("deepar");
        deepAR = await deepar.initialize({
          licenseKey,
          canvas,
          rootPath: DEEPAR_ROOT_PATH,
          additionalOptions: {
            cameraConfig: { disableDefaultCamera: true },
            hint: [
              "faceModelsPredownload",
              "faceInit",
              "segmentationModelsPredownload",
              "segmentationInit",
            ],
          },
        });
        if (cancelled) {
          deepAR.shutdown();
          return;
        }

        deepARRef.current = deepAR;
        deepAR.setVideoElement(video, true);
        deepAR.setFps(30);

        await waitForNextFrames(3);
        await applyDeepAREffect(deepAR, effectRef.current);
        if (cancelled) return;

        await waitForNextFrames(2);

        const stream = deepAR.getCanvas().captureStream(30);
        outputTrack = stream.getVideoTracks()[0];
        if (!outputTrack || cancelled) return;

        await track.replaceTrack(outputTrack, true);
        pipelineActiveRef.current = true;
        setStatus("ready");
        setError(null);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "AR failed to start";
        console.error("[DeepAR] init failed:", err);
        setStatus("error");
        setError(message);
      }
    };

    void start();

    return () => {
      cancelled = true;
      video.pause();
      video.srcObject = null;
      outputTrack?.stop();
      deepAR?.shutdown();
      deepARRef.current = null;

      if (pipelineActiveRef.current) {
        void track.replaceTrack(original, true).catch(() => undefined);
        pipelineActiveRef.current = false;
      }

      setStatus("idle");
      setError(null);
    };
  }, [track, enabled]);

  useEffect(() => {
    const deepAR = deepARRef.current;
    if (!enabled || status !== "ready" || !deepAR) return;

    void applyDeepAREffect(deepAR, effect).catch((err) => {
      console.error("[DeepAR] effect switch failed:", err);
      setError(err instanceof Error ? err.message : "Could not switch AR lens");
    });
  }, [effect, enabled, status]);

  return { status, error };
}
