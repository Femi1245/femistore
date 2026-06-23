"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="vintage-page flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <AlertTriangle className="mb-4 h-12 w-12 text-vintage-rust" />
      <h1 className="font-display text-2xl font-bold text-vintage-ink">
        This page couldn&apos;t load
      </h1>
      <p className="mt-2 max-w-md text-sm text-vintage-ink-muted">
        Something went wrong loading this page. This often happens right after a
        new deploy — a full reload usually fixes it.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="vintage-btn px-5 py-2.5 text-sm"
        >
          Reload
        </button>
        <button
          type="button"
          onClick={() => reset()}
          className="vintage-btn-outline px-5 py-2.5 text-sm"
        >
          Try again
        </button>
        <Link href="/chat" className="vintage-btn-outline px-5 py-2.5 text-sm">
          Open chat
        </Link>
      </div>
    </div>
  );
}
