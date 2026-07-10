"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

function canGoBackInApp(): boolean {
  if (typeof window === "undefined") return false;
  const ref = document.referrer;
  if (!ref) return window.history.length > 1;
  try {
    return new URL(ref).origin === window.location.origin;
  } catch {
    return window.history.length > 1;
  }
}

/** Prefer in-app history; fall back when the page was opened cold. */
export function BackButton({
  fallbackHref = "/notifications",
  label = "Back",
  className = "mb-3 inline-flex items-center gap-1.5 text-sm text-vintage-ink-muted hover:text-vintage-rust",
}: {
  fallbackHref?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        if (canGoBackInApp()) {
          router.back();
          return;
        }
        router.push(fallbackHref);
      }}
    >
      <ArrowLeft className="h-4 w-4" /> {label}
    </button>
  );
}
