"use client";

import { useEffect } from "react";
import { ensureNativeOAuthListener } from "@/lib/native-oauth";
import { isCapacitorAppShell } from "@/lib/native-shell";

/** Keeps Capacitor deep-link OAuth ready for the whole app session. */
export function NativeOAuthListener() {
  useEffect(() => {
    if (!isCapacitorAppShell()) return;
    void ensureNativeOAuthListener();
  }, []);

  return null;
}
