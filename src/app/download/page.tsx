import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Download, Share, Smartphone } from "lucide-react";
import { Logo } from "@/components/Logo";
import { GetTheAppSection } from "@/components/pwa/GetTheAppSection";
import { getAndroidApkUrl } from "@/lib/app-download";

export const metadata: Metadata = {
  title: "Download Zumelia app",
  description:
    "Install the Zumelia Android app — opens as a real app, not a browser.",
};

export default function DownloadPage() {
  const apkUrl = getAndroidApkUrl();

  return (
    <div className="vintage-page min-h-screen">
      <nav className="vintage-nav sticky top-0 z-50">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Logo showWordmark />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-vintage-ink-muted hover:text-vintage-ink"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="editorial-eyebrow mb-2">Standalone app</p>
        <h1 className="editorial-title text-3xl md:text-4xl">Install Zumelia</h1>
        <p className="editorial-lead mt-3 max-w-xl">
          Download the Android app once. After that, open the{" "}
          <strong>Zumelia</strong> icon — you go straight into the app, not the
          browser.
        </p>

        <div className="mt-8">
          <a
            href={apkUrl}
            className="vintage-btn inline-flex items-center gap-2 px-6 py-3.5 text-base"
            rel="noopener noreferrer"
          >
            <Download className="h-5 w-5" />
            Download Zumelia.apk
          </a>
          <p className="mt-3 text-xs text-vintage-ink-muted">
            If the file is not ready yet, wait a few minutes after the latest
            GitHub deploy, or open{" "}
            <a
              href="https://github.com/Femi1245/femistore/releases/latest"
              className="font-semibold text-vintage-rust hover:underline"
              rel="noopener noreferrer"
            >
              GitHub Releases
            </a>
            .
          </p>
        </div>

        <div className="mt-10">
          <GetTheAppSection compact showPageLink={false} />
        </div>

        <div className="mt-8 space-y-4">
          <div className="vintage-card p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-vintage-ink">
              <Smartphone className="h-5 w-5 text-vintage-rust" />
              Android — real app
            </h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-vintage-ink-muted">
              <li>
                Tap <strong>Download Zumelia.apk</strong> above.
              </li>
              <li>Open the file and allow install if Android asks.</li>
              <li>
                Open <strong>Zumelia</strong> from your app list — it launches as
                an app (no browser).
              </li>
            </ol>
          </div>

          <div className="vintage-card p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-vintage-ink">
              <Share className="h-5 w-5 text-vintage-rust" />
              iPhone
            </h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-vintage-ink-muted">
              <li>Open this site in <strong>Safari</strong>.</li>
              <li>
                Tap <Share className="inline h-3.5 w-3.5 align-text-bottom" /> Share
                → <strong>Add to Home Screen</strong>.
              </li>
              <li>Open Zumelia from your home screen.</li>
            </ol>
          </div>
        </div>
      </main>
    </div>
  );
}
