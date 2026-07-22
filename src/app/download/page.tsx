import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Download, Share, Smartphone } from "lucide-react";
import { Logo } from "@/components/Logo";
import { GetTheAppSection } from "@/components/pwa/GetTheAppSection";
import {
  ANDROID_APK_CACHE_BUST,
  ANDROID_RELEASES_PAGE,
  getAndroidApkLabel,
  getAndroidApkUrl,
} from "@/lib/app-download";

export const metadata: Metadata = {
  title: "Download Zumelia app",
  description:
    "Install the latest Zumelia Android app — Google sign-in fix, opens as a real app.",
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

        <div className="mt-6 rounded-2xl border border-vintage-rust/40 bg-vintage-rust/10 p-4 text-sm text-vintage-ink">
          <p className="font-semibold text-vintage-rust">
            Google sign-in fix — build {ANDROID_APK_CACHE_BUST}
          </p>
          <p className="mt-1 text-vintage-ink-muted">
            Critical: uninstall the old Zumelia app first, then install this new
            APK. Older builds could not load Google sign-in plugins.
          </p>
        </div>

        <div className="mt-8">
          <a
            href={apkUrl}
            className="vintage-btn inline-flex items-center gap-2 px-6 py-3.5 text-base"
            rel="noopener noreferrer"
            download="Zumelia.apk"
          >
            <Download className="h-5 w-5" />
            Download {getAndroidApkLabel()}
          </a>
          <p className="mt-3 text-xs text-vintage-ink-muted">
            Direct from GitHub Releases. If the file looks old, open{" "}
            <a
              href={ANDROID_RELEASES_PAGE}
              className="font-semibold text-vintage-rust hover:underline"
              rel="noopener noreferrer"
            >
              the release page
            </a>{" "}
            and download <strong>Zumelia.apk</strong> again.
          </p>
        </div>

        <div className="mt-10">
          <GetTheAppSection compact showPageLink={false} />
        </div>

        <div className="mt-8 space-y-4">
          <div className="vintage-card p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-vintage-ink">
              <Smartphone className="h-5 w-5 text-vintage-rust" />
              Android — update / install
            </h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-vintage-ink-muted">
              <li>
                <strong>Uninstall</strong> any existing Zumelia app (long-press
                icon → Uninstall).
              </li>
              <li>
                On your phone browser, open{" "}
                <a
                  href="https://itunes-mu.vercel.app/download"
                  className="font-semibold text-vintage-rust hover:underline"
                >
                  itunes-mu.vercel.app/download
                </a>{" "}
                and tap <strong>Download {getAndroidApkLabel()}</strong>.
              </li>
              <li>Open the downloaded file and allow install if Android asks.</li>
              <li>
                Open <strong>Zumelia</strong> from your app list — then try Google
                sign-in again.
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
