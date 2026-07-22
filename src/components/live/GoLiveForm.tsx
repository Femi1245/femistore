"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Radio } from "lucide-react";
import { LiveSetupNotice } from "@/components/live/LiveSetupNotice";
import {
  LIVE_CATEGORIES,
  type LiveCategory,
} from "@/lib/live-categories";

export function GoLiveForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<LiveCategory>("video");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canGoLive, setCanGoLive] = useState(true);

  useEffect(() => {
    fetch("/api/live/status")
      .then((r) => r.json())
      .then((data: { ready: boolean }) => setCanGoLive(data.ready))
      .catch(() => setCanGoLive(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !canGoLive) return;

    setLoading(true);
    setError(null);

    const res = await fetch("/api/live/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), category }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not start live stream");
      setLoading(false);
      return;
    }

    router.push(`/live/${data.stream.room_name}`);
  }

  return (
    <>
      <LiveSetupNotice />
      <form onSubmit={handleSubmit} className="vintage-card space-y-4 p-6">
      <div className="flex items-center gap-2 text-vintage-rust">
        <Radio className="h-5 w-5" />
        <h2 className="font-display text-lg font-bold text-vintage-ink">Go live</h2>
      </div>
      <p className="text-sm text-vintage-ink-muted">
        Choose what you are streaming. For Gaming, Music, or Events, tap Share
        screen once you are live (allow capture on Android, then switch to your
        game) so viewers see real gameplay — not only your camera.
      </p>
      <fieldset>
        <legend className="mb-2 block text-xs font-medium text-vintage-ink-muted">
          Stream category
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {LIVE_CATEGORIES.map((option) => {
            const Icon = option.icon;
            const selected = category === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setCategory(option.id)}
                aria-pressed={selected}
                className={`rounded-lg border p-3 text-left transition ${
                  selected
                    ? "border-vintage-rust bg-vintage-rust/10 text-vintage-rust"
                    : "border-vintage-border bg-vintage-paper text-vintage-ink hover:border-vintage-rust/50"
                }`}
              >
                <Icon className="mb-2 h-4 w-4" />
                <span className="block text-sm font-semibold">{option.label}</span>
                <span className="mt-1 block text-[11px] leading-snug text-vintage-ink-muted">
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>
      <div>
        <label className="mb-1 block text-xs font-medium text-vintage-ink-muted">
          Stream title
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What are you streaming today?"
          maxLength={120}
          required
          className="vintage-input w-full px-4 py-2.5"
        />
      </div>
      {error && (
        <p className="vintage-card-inset px-3 py-2 text-sm text-vintage-rust">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading || !title.trim() || !canGoLive}
        className="vintage-btn flex w-full items-center justify-center gap-2 py-3 disabled:opacity-50"
      >
        <Radio className="h-4 w-4" />
        {loading ? "Starting…" : canGoLive ? "Start live stream" : "Setup required first"}
      </button>
    </form>
    </>
  );
}
