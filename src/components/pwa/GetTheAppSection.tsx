"use client";

import Link from "next/link";
import { Download, Smartphone, Share, MonitorSmartphone } from "lucide-react";
import { getAndroidApkUrl } from "@/lib/app-download";

/** Permanent download / install section — always visible (not dismissible). */
export function GetTheAppSection({
  compact = false,
  showPageLink = true,
}: {
  compact?: boolean;
  showPageLink?: boolean;
}) {
  const apkUrl = getAndroidApkUrl();

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
            Install Zumelia on your phone
          </h2>
          <p
            className={
              compact
                ? "mt-2 text-sm text-vintage-ink-muted"
                : "editorial-lead mx-auto mt-3"
            }
          >
            Download the Android app, or add Zumelia to your home screen from the
            browser — so it opens like a real app every time.
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
              Android APK
            </h3>
            <p className="flex-1 text-sm text-vintage-ink-muted">
              Install the standalone Zumelia app. Open it from your home screen —
              no browser needed.
            </p>
            {apkUrl ? (
              <a
                href={apkUrl}
                className="vintage-btn inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm"
                rel="noopener noreferrer"
              >
                <Download className="h-4 w-4" />
                Download for Android
              </a>
            ) : (
              <p className="rounded-lg border border-vintage-border bg-vintage-card-inset px-3 py-2 text-xs text-vintage-ink-muted">
                APK link coming soon. Meanwhile, use{" "}
                <strong>Install / Add to Home Screen</strong> below, or visit{" "}
                {showPageLink ? (
                  <Link href="/download" className="font-semibold text-vintage-rust hover:underline">
                    /download
                  </Link>
                ) : (
                  "this page"
                )}{" "}
                after we publish the build.
              </p>
            )}
          </div>

          <div className="vintage-card flex flex-col gap-3 p-5 text-left">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-vintage-rust/10 text-vintage-rust">
              <MonitorSmartphone className="h-5 w-5" />
            </div>
            <h3 className="font-display text-lg font-semibold text-vintage-ink">
              Home screen (any phone)
            </h3>
            <p className="flex-1 text-sm text-vintage-ink-muted">
              <span className="inline-flex items-center gap-1 font-medium text-vintage-ink">
                <Share className="h-3.5 w-3.5" /> iPhone:
              </span>{" "}
              Share → <strong>Add to Home Screen</strong>.
              <br />
              <span className="font-medium text-vintage-ink">Android Chrome:</span>{" "}
              Menu → <strong>Install app</strong> or <strong>Add to Home screen</strong>.
            </p>
            {showPageLink && (
              <Link
                href="/download"
                className="vintage-btn-outline inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm"
              >
                Full install guide
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
