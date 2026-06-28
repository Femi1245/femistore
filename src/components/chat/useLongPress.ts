"use client";

import { useCallback, useRef } from "react";

export function useLongPress(onLongPress: () => void, delayMs = 450) {
  const timerRef = useRef<number | null>(null);
  const firedRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onTouchStart = useCallback(() => {
    firedRef.current = false;
    clear();
    timerRef.current = window.setTimeout(() => {
      firedRef.current = true;
      onLongPress();
    }, delayMs);
  }, [clear, delayMs, onLongPress]);

  const onTouchEnd = useCallback(() => {
    clear();
  }, [clear]);

  const onTouchMove = useCallback(() => {
    clear();
  }, [clear]);

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onLongPress();
    },
    [onLongPress],
  );

  return {
    onTouchStart,
    onTouchEnd,
    onTouchMove,
    onContextMenu,
    wasLongPress: () => firedRef.current,
    clearLongPress: () => {
      firedRef.current = false;
    },
  };
}
