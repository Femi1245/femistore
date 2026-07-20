"use client";

import { useEffect, useState } from "react";
import { Check, Download, Loader2, Share, Smartphone } from "lucide-react";
import { isInstalledAppShell } from "@/lib/native-shell";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function detectPlatform(): "ios" | "android" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  const ua = window.navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

/** One-click install when the browser supports it (Chrome/Edge/Android). */
export function InstallAppButton({
  className = "vintage-btn inline-flex items-center justify-center gap-2 px-5 py-3 text-sm",
  label = "Install Zumelia",
}: {
  className?: string;
  label?: string;
}) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    if (isInstalledAppShell()) {
      setInstalled(true);
      setReady(true);
      return;
    }

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }

    function onInstalled() {
      setInstalled(true);
      setDeferred(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    setReady(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred || busy) return;
    setBusy(true);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setDeferred(null);
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <button type="button" disabled className={`${className} opacity-60`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </button>
    );
  }

  if (installed) {
    return (
      <p className="inline-flex items-center gap-2 rounded-lg border border-vintage-border bg-vintage-card-inset px-4 py-3 text-sm font-medium text-vintage-ink">
        <Check className="h-4 w-4 text-vintage-olive" />
        Zumelia is installed on this device
      </p>
    );
  }

  if (deferred) {
    return (
      <button type="button" onClick={() => void install()} disabled={busy} className={className}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {label}
      </button>
    );
  }

  if (platform === "ios") {
    return (
      <p className="rounded-lg border border-vintage-border bg-vintage-card-inset px-4 py-3 text-sm leading-relaxed text-vintage-ink-muted">
        On iPhone: tap{" "}
        <Share className="inline h-3.5 w-3.5 align-text-bottom text-vintage-ink" /> Share →{" "}
        <strong className="text-vintage-ink">Add to Home Screen</strong>
      </p>
    );
  }

  return (
    <p className="rounded-lg border border-vintage-border bg-vintage-card-inset px-4 py-3 text-sm leading-relaxed text-vintage-ink-muted">
      <Smartphone className="mr-1 inline h-3.5 w-3.5 align-text-bottom" />
      Open this site in <strong className="text-vintage-ink">Chrome</strong> on your phone, then use
      the browser menu → <strong className="text-vintage-ink">Install app</strong> or{" "}
      <strong className="text-vintage-ink">Add to Home screen</strong>.
    </p>
  );
}
