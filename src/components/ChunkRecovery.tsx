"use client";

import { useEffect } from "react";
import { isBenignLiveKitError } from "@/lib/livekit-errors";

const RELOAD_KEY = "zumelia-chunk-reload";

function isChunkLoadFailure(reason: unknown): boolean {
  const message = String(
    reason instanceof Error ? reason.message : reason ?? "",
  );
  return (
    message.includes("ChunkLoadError") ||
    message.includes("Loading chunk") ||
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Failed to load chunk")
  );
}

/** One automatic hard reload after a deploy/chunk mismatch so users recover without clearing cache. */
export function ChunkRecovery() {
  useEffect(() => {
    function onRejection(event: PromiseRejectionEvent) {
      if (isBenignLiveKitError(event.reason)) {
        event.preventDefault();
        return;
      }
      if (!isChunkLoadFailure(event.reason)) return;
      if (sessionStorage.getItem(RELOAD_KEY)) return;
      sessionStorage.setItem(RELOAD_KEY, "1");
      window.location.reload();
    }

    function onError(event: ErrorEvent) {
      if (isBenignLiveKitError(event.error ?? event.message)) {
        event.preventDefault();
        return;
      }
      if (!isChunkLoadFailure(event.error ?? event.message)) return;
      if (sessionStorage.getItem(RELOAD_KEY)) return;
      sessionStorage.setItem(RELOAD_KEY, "1");
      window.location.reload();
    }

    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onError);
    return () => {
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError);
    };
  }, []);

  return null;
}
