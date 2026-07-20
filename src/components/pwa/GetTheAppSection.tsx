"use client";

import Link from "next/link";
import { Download, MonitorSmartphone, Share, Smartphone } from "lucide-react";
import { InstallAppButton } from "@/components/pwa/InstallAppButton";
import { getAndroidApkUrl } from "@/lib/app-download";
import { isCapacitorNative } from "@/lib/native-shell";
import { useEffect, useState } from "react";

/** Permanent install section — real Android APK + optional browser install. */
export function GetTheAppSection({
  compact = false,
  showPageLink = true,
}: {
  compact?: boolean;
  showPageLink?: boolean;
}) {
  const apkUrl = getAndroidApkUrl();
  const [inNativeApp, setInNativeApp] = useState(false);

  useEffect(() => {
    setInNativeApp(isCapacitorNative());
  }, []);

  if (inNativeApp) return null;

  return (
    <section
      id="get-the-app"
      className={
        compact
          ? "rounded-2xl border border-vintage-border bg-vintage-paper p-5"
          : "border-y border-vintage-border bg-vintage-paper-dark/40 py-16"
      }
    >
      <div className={compact ? undefined : "mx-auto max-w-6xl px-6"}>
        <div className={compact ? undefined : "mx-auto max-w-3xl text-center"}>
          <p className="editorial-eyebrow mb-2">Get the app</p>
          <h2
            className={
              compact
                ? "font-display text-xl font-semibold text-vintage-ink"
                : "editorial-title text-3xl md:text-4xl"
            }
          >
            Zumelia as a real phone app
          </h2>
          <p
            className={
              compact
                ? "mt-2 text-sm text-vintage-ink-muted"
                : "editorial-lead mx-auto mt-3"
            }
          >
            Install once. After that, tap the <strong>Zumelia</strong> icon — it
            opens the app itself, not a browser tab.
          </p>
        </div>

        <div
          className={
            compact
              ? "mt-4 grid gap-3"
              : "mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2"
          }
        >
          <div className="vintage-card flex flex-col gap-3 p-5 text-left">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-vintage-rust/10 text-vintage-rust">
              <Smartphone className="h-5 w-5" />
            </div>
            <h3 className="font-display text-lg font-semibold text-vintage-ink">
              Android app (recommended)
            </h3>
            <p className="flex-1 text-sm text-vintage-ink-muted">
              Download the APK, install it, then open Zumelia from your app
              drawer — full screen, no browser bar.
            </p>
            <a
              href={apkUrl}
              className="vintage-btn inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm"
              rel="noopener noreferrer"
            >
              <Download className="h-4 w-4" />
              Download Zumelia.apk
            </a>
          </div>

          <div className="vintage-card flex flex-col gap-3 p-5 text-left">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-vintage-rust/10 text-vintage-rust">
              <MonitorSmartphone className="h-5 w-5" />
            </div>
            <h3 className="font-display text-lg font-semibold text-vintage-ink">
              iPhone / quick install
            </h3>
            <p className="text-sm text-vintage-ink-muted">
              <Share className="inline h-3.5 w-3.5 align-text-bottom" /> Safari →
              Share → <strong>Add to Home Screen</strong>. Or use the button
              below on Android Chrome.
            </p>
            <InstallAppButton className="vintage-btn-outline inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm" />
          </div>
        </div>

        {showPageLink && (
          <p className={compact ? "mt-4 text-center text-sm" : "mt-8 text-center text-sm"}>
            <Link href="/download" className="font-semibold text-vintage-rust hover:underline">
              Full install guide →
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
