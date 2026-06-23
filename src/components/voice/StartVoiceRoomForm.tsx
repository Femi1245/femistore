"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LiveSetupNotice } from "@/components/live/LiveSetupNotice";

export function StartVoiceRoomForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/voice/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, topic }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Could not start lounge");
      return;
    }

    router.push(`/voice/${encodeURIComponent(data.room.room_name)}`);
  }

  return (
    <div className="space-y-4">
      <LiveSetupNotice />
      <form onSubmit={(e) => void handleSubmit(e)} className="vintage-card space-y-4 p-5 sm:p-6">
        <div>
          <h1 className="font-display text-xl font-bold text-vintage-ink">Start a voice lounge</h1>
          <p className="mt-1 text-sm text-vintage-ink-muted">
            Audio-only hangout — no camera pressure. Friends can join and talk in real time.
          </p>
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-vintage-ink">Lounge name</span>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Late night vibes"
            className="vintage-input w-full px-3 py-2.5 text-sm"
            maxLength={120}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-vintage-ink">Topic (optional)</span>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Music, study session, business ideas…"
            className="vintage-input w-full px-3 py-2.5 text-sm"
          />
        </label>
        {error && <p className="text-sm text-vintage-rust">{error}</p>}
        <button type="submit" disabled={loading} className="vintage-btn w-full py-3 disabled:opacity-50">
          {loading ? "Starting…" : "Go live (audio only)"}
        </button>
      </form>
    </div>
  );
}
