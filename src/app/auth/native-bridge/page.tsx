"use client";

import { useEffect, useState } from "react";
import { nativeOAuthDeepLinkUrl } from "@/lib/app-url";

/**
 * Loaded inside the in-app browser after Google/X/GitHub OAuth.
 * Immediately hands control back to the Zumelia app via deep link.
 */
export default function NativeAuthBridgePage() {
  const [message, setMessage] = useState("Returning to Zumelia…");

  useEffect(() => {
    const search = window.location.search || "";
    const hash = window.location.hash || "";
    const deepLink = nativeOAuthDeepLinkUrl(search, hash);

    setMessage("Opening Zumelia…");
    window.location.replace(deepLink);

    // Fallback if the deep link did not take over
    const timer = window.setTimeout(() => {
      setMessage(
        "Tap “Open in Zumelia” if prompted, or return to the app to finish signing in.",
      );
    }, 1500);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        background: "#FAF8F5",
        color: "#1a1a1a",
        fontFamily: "system-ui, sans-serif",
        textAlign: "center",
      }}
    >
      <p style={{ margin: 0, fontSize: "1.05rem" }}>{message}</p>
    </main>
  );
}
