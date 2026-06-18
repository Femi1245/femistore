"use client";

import { useEffect, useState } from "react";
import {
  getMobileAppearance,
  MOBILE_APPEARANCE_EVENT,
} from "@/lib/mobile-appearance";

export function AppShellMain({
  children,
  maxWidth,
}: {
  children: React.ReactNode;
  maxWidth: string;
}) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const sync = () => setCompact(getMobileAppearance().compactSpacing);
    sync();
    window.addEventListener(MOBILE_APPEARANCE_EVENT, sync);
    return () => window.removeEventListener(MOBILE_APPEARANCE_EVENT, sync);
  }, []);

  return (
    <main
      className={`mx-auto px-3 py-4 sm:px-4 sm:py-6 md:px-4 ${maxWidth} ${
        compact ? "mobile-compact-main" : ""
      }`}
    >
      {children}
    </main>
  );
}
