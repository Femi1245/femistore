"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function InstallAppPrompt() {
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return;

    const dismissed = localStorage.getItem("itunes-install-dismissed");
    if (dismissed) return;

    if (isIos()) {
      const timer = window.setTimeout(() => {
        setIosHint(true);
        setVisible(true);
      }, 2500);
      return () => window.clearTimeout(timer);
    }

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  function dismiss() {
    localStorage.setItem("itunes-install-dismissed", "1");
    setVisible(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-4 right-4 z-[60] md:bottom-4 md:left-auto md:right-4 md:max-w-sm">
      <div className="vintage-card flex items-start gap-3 p-4 shadow-lg">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-vintage-rust text-[var(--vintage-btn-text)]">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold text-vintage-ink">
            Install iTunes app
          </p>
          {iosHint ? (
            <p className="mt-1 text-xs leading-relaxed text-vintage-ink-muted">
              Tap <Share className="inline h-3.5 w-3.5 align-text-bottom" /> Share,
              then <strong>Add to Home Screen</strong> for a full-screen app experience.
            </p>
          ) : (
            <p className="mt-1 text-xs text-vintage-ink-muted">
              Add iTunes to your home screen for faster access and notifications.
            </p>
          )}
          <div className="mt-3 flex gap-2">
            {!iosHint && deferred && (
              <button type="button" onClick={install} className="vintage-btn px-3 py-1.5 text-xs">
                Install
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="vintage-btn-outline px-3 py-1.5 text-xs"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 text-vintage-ink-muted hover:text-vintage-ink"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
