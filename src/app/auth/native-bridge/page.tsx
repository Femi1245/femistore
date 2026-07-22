"use client";

import { useEffect, useMemo, useState } from "react";
import { nativeOAuthDeepLinkUrl } from "@/lib/app-url";

/**
 * Loaded inside the in-app browser after Google/X/GitHub OAuth.
 * Immediately hands control back to the Zumelia app via deep link.
 */
export default function NativeAuthBridgePage() {
  const [message, setMessage] = useState("Returning to Zumelia…");

  const deepLink = useMemo(() => {
    if (typeof window === "undefined") return "zumelia://auth/callback";
    const search = window.location.search || "";
    const hash = window.location.hash || "";
    return nativeOAuthDeepLinkUrl(search, hash);
  }, []);

  useEffect(() => {
    setMessage("Opening Zumelia…");

    // Android intent fallback helps Custom Tabs return to the installed app.
    const intentLink = deepLink.replace(
      "zumelia://",
      "intent://",
    ) + "#Intent;scheme=zumelia;package=com.zumelia.app;end";

    try {
      window.location.href = intentLink;
    } catch {
      window.location.replace(deepLink);
    }

    const timer = window.setTimeout(() => {
      setMessage("Tap the button below if Zumelia did not open automatically.");
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [deepLink]);

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
      <a
        href={deepLink}
        style={{
          marginTop: "1.25rem",
          display: "inline-block",
          padding: "0.75rem 1.25rem",
          borderRadius: "999px",
          background: "#b85c38",
          color: "#fffaf5",
          textDecoration: "none",
          fontWeight: 600,
        }}
      >
        Open Zumelia
      </a>
    </main>
  );
}
