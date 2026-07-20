"use client";

import { NATIVE_SHELL_BOOT_SCRIPT } from "@/lib/native-shell";

/** Early native-shell detection before React paints install UI. */
export function NativeShellGuard() {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: NATIVE_SHELL_BOOT_SCRIPT }}
    />
  );
}
