import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Download, Share, Smartphone } from "lucide-react";
import { Logo } from "@/components/Logo";
import { GetTheAppSection } from "@/components/pwa/GetTheAppSection";
import { getAndroidApkUrl } from "@/lib/app-download";

export const metadata: Metadata = {
  title: "Download Zumelia",
  description: "Install the Zumelia app on Android or add it to your home screen.",
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
        <p className="editorial-eyebrow mb-2">Zumelia app</p>
        <h1 className="editorial-title text-3xl md:text-4xl">Download & install</h1>
        <p className="editorial-lead mt-3 max-w-xl">
          Keep Zumelia on your phone. This page stays here whenever you need the
          install link again.
        </p>

        <div className="mt-10">
          <GetTheAppSection compact showPageLink={false} />
        </div>

        <div className="mt-8 space-y-4">
          <div className="vintage-card p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-vintage-ink">
              <Smartphone className="h-5 w-5 text-vintage-rust" />
              Android steps
            </h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-vintage-ink-muted">
              <li>
                {apkUrl ? (
                  <>
                    Tap{" "}
                    <a href={apkUrl} className="font-semibold text-vintage-rust hover:underline">
                      Download for Android
                    </a>{" "}
                    above.
                  </>
                ) : (
                  <>
                    When the APK is published, tap <strong>Download for Android</strong>{" "}
                    above — or use Chrome → Install app.
                  </>
                )}
              </li>
              <li>Open the downloaded file and allow install from this source if asked.</li>
              <li>Open <strong>Zumelia</strong> from your app drawer and sign in.</li>
            </ol>
          </div>

          <div className="vintage-card p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-vintage-ink">
              <Share className="h-5 w-5 text-vintage-rust" />
              iPhone steps
            </h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-vintage-ink-muted">
              <li>Open this site in <strong>Safari</strong>.</li>
              <li>
                Tap the <Share className="inline h-3.5 w-3.5 align-text-bottom" /> Share
                button.
              </li>
              <li>
                Choose <strong>Add to Home Screen</strong>, then Add.
              </li>
              <li>Open Zumelia from your home screen like any other app.</li>
            </ol>
          </div>
        </div>

        {apkUrl && (
          <div className="mt-8 text-center">
            <a
              href={apkUrl}
              className="vintage-btn inline-flex items-center gap-2 px-6 py-3"
              rel="noopener noreferrer"
            >
              <Download className="h-4 w-4" />
              Download Android APK
            </a>
          </div>
        )}

        <p className="mt-10 text-center text-sm text-vintage-ink-muted">
          Prefer the browser for now?{" "}
          <Link href="/signup" className="font-semibold text-vintage-rust hover:underline">
            Create an account
          </Link>{" "}
          or{" "}
          <Link href="/login" className="font-semibold text-vintage-rust hover:underline">
            sign in
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
