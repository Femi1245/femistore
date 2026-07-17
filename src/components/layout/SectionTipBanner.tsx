"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import {
  SECTION_TIPS,
  sectionTipStorageKey,
  type SectionTipId,
} from "@/lib/section-tips";

export function SectionTipBanner({
  section,
  className = "",
}: {
  section: SectionTipId;
  className?: string;
}) {
  const tip = SECTION_TIPS[section];
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(sectionTipStorageKey(section))) return;
      setVisible(true);
    } catch {
      setVisible(true);
    }
  }, [section]);

  function dismiss() {
    try {
      localStorage.setItem(sectionTipStorageKey(section), "1");
    } catch {
      /* ignore quota / private mode */
    }
    setVisible(false);
  }

  if (!visible) return null;

  const Icon = tip.icon;

  return (
    <aside
      className={`vintage-card flex gap-3 p-3 sm:items-start sm:p-4 ${className}`}
      role="status"
      aria-label={`${tip.title} tip`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-vintage-rust/10 text-vintage-rust">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-bold text-vintage-ink">
              {tip.title}
            </p>
            <p className="mt-0.5 text-sm leading-relaxed text-vintage-ink-muted">
              {tip.body}
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 rounded-lg p-1.5 text-vintage-ink-muted transition hover:bg-vintage-paper-dark hover:text-vintage-ink"
            aria-label="Dismiss tip"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {tip.ctaHref && tip.ctaLabel && (
            <Link
              href={tip.ctaHref}
              className="vintage-btn px-3 py-1.5 text-xs"
              onClick={dismiss}
            >
              {tip.ctaLabel}
            </Link>
          )}
          <button
            type="button"
            onClick={dismiss}
            className="text-xs font-semibold text-vintage-ink-muted hover:text-vintage-rust"
          >
            Got it
          </button>
        </div>
      </div>
    </aside>
  );
}
