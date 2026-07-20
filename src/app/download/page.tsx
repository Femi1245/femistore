import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Share, Smartphone } from "lucide-react";
import { Logo } from "@/components/Logo";
import { GetTheAppSection } from "@/components/pwa/GetTheAppSection";

export const metadata: Metadata = {
  title: "Install Zumelia",
  description: "Install Zumelia on your phone from the browser — JavaScript PWA, no app store.",
};

export default function DownloadPage() {
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
        <p className="editorial-eyebrow mb-2">Web app install</p>
        <h1 className="editorial-title text-3xl md:text-4xl">Install Zumelia</h1>
        <p className="editorial-lead mt-3 max-w-xl">
          Install directly from this site with JavaScript. You get a home-screen icon
          and a full-screen app — no Expo, no Play Store upload required.
        </p>

        <div className="mt-10">
          <GetTheAppSection compact showPageLink={false} />
        </div>

        <div className="mt-8 space-y-4">
          <div className="vintage-card p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-vintage-ink">
              <Smartphone className="h-5 w-5 text-vintage-rust" />
              Android
            </h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-vintage-ink-muted">
              <li>
                Open{" "}
                <a
                  href="https://itunes-mu.vercel.app/download"
                  className="font-semibold text-vintage-rust hover:underline"
                >
                  itunes-mu.vercel.app/download
                </a>{" "}
                in <strong>Chrome</strong>.
              </li>
              <li>
                Tap <strong>Install Zumelia now</strong>, or Chrome menu →{" "}
                <strong>Install app</strong>.
              </li>
              <li>Open Zumelia from your home screen like any other app.</li>
            </ol>
          </div>

          <div className="vintage-card p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-vintage-ink">
              <Share className="h-5 w-5 text-vintage-rust" />
              iPhone
            </h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-vintage-ink-muted">
              <li>Open this page in <strong>Safari</strong> (not Chrome-in-app).</li>
              <li>
                Tap the <Share className="inline h-3.5 w-3.5 align-text-bottom" /> Share
                button.
              </li>
              <li>
                Choose <strong>Add to Home Screen</strong>, then Add.
              </li>
            </ol>
          </div>
        </div>

        <p className="mt-10 text-center text-sm text-vintage-ink-muted">
          Prefer the browser tab?{" "}
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
