"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Clapperboard, Loader2, Search } from "lucide-react";
import type { VideoResult } from "@/lib/youtube";
import { VideoCard } from "@/components/watch/VideoCard";

export function VideoSearchView() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [videos, setVideos] = useState<VideoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const res = await fetch(`/api/videos/search?q=${encodeURIComponent(trimmed)}`);
      const data = (await res.json()) as {
        videos?: VideoResult[];
        redirectTo?: string;
        error?: string;
      };

      if (data.redirectTo) {
        router.push(data.redirectTo);
        return;
      }

      if (!res.ok) {
        setVideos([]);
        setError(data.error ?? "Search failed. Try again in a moment.");
        return;
      }

      setVideos(data.videos ?? []);
    } catch {
      setVideos([]);
      setError("Could not reach the video search service.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-vintage-ink">Watch</h1>
        <p className="text-sm text-vintage-ink-muted">
          Search the library and stream videos right inside Zumelia.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-vintage-ink-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search music videos, tutorials, documentaries…"
            className="vintage-input w-full py-3 pl-10 pr-4"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="vintage-btn flex items-center justify-center gap-2 px-6 py-3"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Search
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="vintage-card border-vintage-rust/40 bg-vintage-paper px-4 py-3 text-sm text-vintage-rust">
          {error}
        </div>
      )}

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="vintage-card overflow-hidden">
              <div className="skeleton aspect-video w-full" />
              <div className="space-y-2 p-3">
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && searched && videos.length === 0 && !error && (
        <div className="vintage-card py-12 text-center">
          <Clapperboard className="mx-auto h-10 w-10 text-vintage-ink-muted" />
          <p className="mt-3 text-vintage-ink-muted">No videos found for that search.</p>
          <p className="mt-1 text-sm text-vintage-ink-muted/80">
            Try different keywords or paste a video link.
          </p>
        </div>
      )}

      {!loading && videos.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}

      {!searched && !loading && (
        <div className="vintage-card p-8 text-center">
          <Clapperboard className="mx-auto h-12 w-12 text-vintage-rust" />
          <p className="mt-4 font-display text-lg font-semibold text-vintage-ink">
            Find something to watch
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-vintage-ink-muted">
            Concerts, interviews, music videos, podcasts, and more — all in one place
            on Zumelia Watch.
          </p>
        </div>
      )}
    </div>
  );
}
