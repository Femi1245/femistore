"use client";

import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";
import {
  DEFAULT_MOBILE_APPEARANCE,
  getMobileAppearance,
  setMobileAppearance,
  MOBILE_APPEARANCE_EVENT,
  type MobileAppearance,
} from "@/lib/mobile-appearance";

export function MobileAppearanceSection() {
  const [prefs, setPrefs] = useState<MobileAppearance>(DEFAULT_MOBILE_APPEARANCE);

  useEffect(() => {
    setPrefs(getMobileAppearance());
    const sync = () => setPrefs(getMobileAppearance());
    window.addEventListener(MOBILE_APPEARANCE_EVENT, sync);
    return () => window.removeEventListener(MOBILE_APPEARANCE_EVENT, sync);
  }, []);

  function update(patch: Partial<MobileAppearance>) {
    setPrefs(setMobileAppearance(patch));
  }

  return (
    <section className="vintage-card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-vintage-rust/10 text-vintage-rust">
          <Smartphone className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-display font-bold text-vintage-ink">Mobile app look</h2>
          <p className="text-xs text-vintage-ink-muted">
            Customize the bottom tab bar and spacing on phones.
          </p>
        </div>
      </div>

      <label className="flex items-center justify-between gap-4">
        <div>
          <span className="text-sm text-vintage-ink">Show tab labels</span>
          <p className="text-xs text-vintage-ink-muted">Names under icons in the bottom bar</p>
        </div>
        <input
          type="checkbox"
          checked={prefs.showTabLabels}
          onChange={(e) => update({ showTabLabels: e.target.checked })}
          className="h-4 w-4 accent-vintage-rust"
        />
      </label>

      <label className="flex items-center justify-between gap-4">
        <div>
          <span className="text-sm text-vintage-ink">Compact spacing</span>
          <p className="text-xs text-vintage-ink-muted">Tighter padding on feed and lists</p>
        </div>
        <input
          type="checkbox"
          checked={prefs.compactSpacing}
          onChange={(e) => update({ compactSpacing: e.target.checked })}
          className="h-4 w-4 accent-vintage-rust"
        />
      </label>

      <div className="rounded-xl vintage-card-inset p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-vintage-ink-muted">
          Preview
        </p>
        <div className="mobile-tab-bar-preview mx-auto max-w-xs rounded-2xl px-2 py-2">
          <div className="flex items-end justify-around">
            {["Home", "Watch", "Chat", "Alerts", "You"].map((label, i) => (
              <div
                key={label}
                className={`flex flex-col items-center gap-0.5 ${
                  i === 2 ? "-mt-1" : ""
                }`}
              >
                <span
                  className={`flex items-center justify-center rounded-xl ${
                    i === 2
                      ? "h-10 w-10 bg-vintage-rust text-white shadow-md"
                      : i === 0
                        ? "h-8 w-8 mobile-tab-active-pill text-vintage-rust"
                        : "h-8 w-8 text-vintage-ink-muted"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-current opacity-80" />
                </span>
                {prefs.showTabLabels && (
                  <span
                    className={`text-[9px] font-semibold ${
                      i === 0 ? "text-vintage-rust" : "text-vintage-ink-muted"
                    }`}
                  >
                    {label}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-vintage-ink-muted">
        Install Zumelia from your browser menu (<strong>Add to Home Screen</strong> on iPhone)
        for a full-screen app with this layout.
      </p>
    </section>
  );
}
