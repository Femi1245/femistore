"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Share, X } from "lucide-react";
import { getAndroidApkUrl } from "@/lib/app-download";
import { isInstalledAppShell } from "@/lib/native-shell";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos(): boolean {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isAndroid(): boolean {
  if (typeof window === "undefined") return false;
  return /android/i.test(window.navigator.userAgent);
}

/** Floating reminder — never shown inside the installed app. */
export function InstallAppPrompt() {
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [android, setAndroid] = useState(false);
  const apkUrl = getAndroidApkUrl();

  useEffect(() => {
    setAndroid(isAndroid());
    if (isInstalledAppShell()) return;
    if (sessionStorage.getItem("zumelia-install-session-dismissed")) return;

    if (isIos()) {
      const timer = window.setTimeout(() => {
        setIosHint(true);
        setVisible(true);
      }, 1800);
      return () => window.clearTimeout(timer);
    }

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    const timer = window.setTimeout(() => setVisible(true), 2000);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.clearTimeout(timer);
    };
  }, []);

  function dismiss() {
    sessionStorage.setItem("zumelia-install-session-dismissed", "1");
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
    <div
      data-install-prompt
      className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 right-4 z-[60] md:bottom-4 md:left-auto md:right-4 md:max-w-sm"
    >
      <div className="vintage-card flex items-start gap-3 p-4 shadow-lg">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-vintage-rust text-[var(--vintage-btn-text)]">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold text-vintage-ink">
            Get the Zumelia app
          </p>
          {iosHint ? (
            <p className="mt-1 text-xs leading-relaxed text-vintage-ink-muted">
              Tap <Share className="inline h-3.5 w-3.5 align-text-bottom" /> Share →{" "}
              <strong>Add to Home Screen</strong>.
            </p>
          ) : (
            <p className="mt-1 text-xs text-vintage-ink-muted">
              Install the Android app once — then open Zumelia from your app icon,
              not the browser.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {android && (
              <a
                href={apkUrl}
                className="vintage-btn px-3 py-1.5 text-xs"
                rel="noopener noreferrer"
                onClick={dismiss}
              >
                Download app
              </a>
            )}
            {!iosHint && deferred && (
              <button
                type="button"
                onClick={install}
                className="vintage-btn-outline px-3 py-1.5 text-xs"
              >
                Install from browser
              </button>
            )}
            <Link
              href="/download"
              className="vintage-btn-outline px-3 py-1.5 text-xs"
              onClick={dismiss}
            >
              Guide
            </Link>
            <button
              type="button"
              onClick={dismiss}
              className="px-2 py-1.5 text-xs text-vintage-ink-muted hover:text-vintage-ink"
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
