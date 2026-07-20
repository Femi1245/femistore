"use client";

import Link from "next/link";
import { MonitorSmartphone, Share, Smartphone } from "lucide-react";
import { InstallAppButton } from "@/components/pwa/InstallAppButton";

/** Permanent install section — JavaScript PWA (no Expo / no APK). */
export function GetTheAppSection({
  compact = false,
  showPageLink = true,
}: {
  compact?: boolean;
  showPageLink?: boolean;
}) {
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
            One tap installs Zumelia from this website — like an app icon on your
            home screen. No app store. No Expo. Pure web install with JavaScript.
          </p>
        </div>

        <div className={compact ? "mt-4" : "mx-auto mt-8 flex max-w-md justify-center"}>
          <InstallAppButton />
        </div>

        <div
          className={
            compact
              ? "mt-4 grid gap-3"
              : "mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2"
          }
        >
          <div className="vintage-card flex flex-col gap-2 p-5 text-left">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-vintage-rust/10 text-vintage-rust">
              <Smartphone className="h-5 w-5" />
            </div>
            <h3 className="font-display text-lg font-semibold text-vintage-ink">
              Android (Chrome)
            </h3>
            <p className="text-sm text-vintage-ink-muted">
              Tap <strong>Install Zumelia</strong> above when it appears, or open the
              Chrome menu → <strong>Install app</strong>.
            </p>
          </div>

          <div className="vintage-card flex flex-col gap-2 p-5 text-left">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-vintage-rust/10 text-vintage-rust">
              <MonitorSmartphone className="h-5 w-5" />
            </div>
            <h3 className="font-display text-lg font-semibold text-vintage-ink">
              iPhone (Safari)
            </h3>
            <p className="text-sm text-vintage-ink-muted">
              Tap <Share className="inline h-3.5 w-3.5 align-text-bottom" /> Share →{" "}
              <strong>Add to Home Screen</strong> → Add.
            </p>
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
