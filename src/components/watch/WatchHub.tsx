"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clapperboard, Clock, ListMusic, Loader2, Search, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Playlist, UserVideo, WatchHistoryEntry, WatchVideo } from "@/lib/types";
import {
  loadPlaylistItems,
  loadPlaylists,
  loadUserVideos,
  loadWatchHistory,
} from "@/lib/watch";
import { LibraryVideoCard } from "@/components/watch/LibraryVideoCard";
import { VideoCard } from "@/components/watch/VideoCard";
import { VideoUploadForm } from "@/components/watch/VideoUploadForm";
import type { VideoResult } from "@/lib/youtube";

type Tab = "search" | "history" | "playlists" | "uploads";

const tabs: { id: Tab; label: string; icon: typeof Search }[] = [
  { id: "search", label: "Search", icon: Search },
  { id: "history", label: "History", icon: Clock },
  { id: "playlists", label: "Playlists", icon: ListMusic },
  { id: "uploads", label: "Upload", icon: Upload },
];

export function WatchHub({ user }: { user: Profile }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("search");
  const [query, setQuery] = useState("");
  const [videos, setVideos] = useState<VideoResult[]>([]);
  const [history, setHistory] = useState<WatchHistoryEntry[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [playlistItems, setPlaylistItems] = useState<WatchVideo[]>([]);
  const [uploads, setUploads] = useState<UserVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const refreshLibrary = useCallback(async () => {
    const supabase = createClient();
    const [historyData, playlistData, uploadData] = await Promise.all([
      loadWatchHistory(supabase, user.id),
      loadPlaylists(supabase, user.id),
      loadUserVideos(supabase),
    ]);
    setHistory(historyData);
    setPlaylists(playlistData);
    setUploads(uploadData);
  }, [user.id]);

  useEffect(() => {
    refreshLibrary();
  }, [refreshLibrary]);

  useEffect(() => {
    if (!selectedPlaylist) {
      setPlaylistItems([]);
      return;
    }
    loadPlaylistItems(createClient(), selectedPlaylist).then(setPlaylistItems);
  }, [selectedPlaylist]);

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
          Search, upload, save playlists, and pick up where you left off on iTunes.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 rounded-sm px-3 py-2 text-sm font-semibold ${
              tab === id
                ? "bg-vintage-rust text-[var(--vintage-btn-text)]"
                : "vintage-btn-outline"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "search" && (
        <>
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
            <div className="vintage-card border-vintage-rust/40 px-4 py-3 text-sm text-vintage-rust">
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
                Stream from the library or upload your own videos on the Upload tab.
              </p>
            </div>
          )}
        </>
      )}

      {tab === "history" && (
        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="vintage-card py-10 text-center text-sm text-vintage-ink-muted">
              No watch history yet. Play a video and it will show up here.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {history.map((item) => (
                <LibraryVideoCard
                  key={item.id}
                  video={item}
                  meta={new Date(item.watchedAt).toLocaleDateString()}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "playlists" && (
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <div className="vintage-card p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-vintage-ink-muted">
              Playlists
            </p>
            {playlists.length === 0 ? (
              <p className="text-sm text-vintage-ink-muted">No playlists yet. Save a video while watching.</p>
            ) : (
              <ul className="space-y-1">
                {playlists.map((playlist) => (
                  <li key={playlist.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedPlaylist(playlist.id)}
                      className={`w-full rounded-sm px-2 py-1.5 text-left text-sm ${
                        selectedPlaylist === playlist.id
                          ? "bg-vintage-rust text-[var(--vintage-btn-text)]"
                          : "hover:bg-vintage-paper-dark"
                      }`}
                    >
                      {playlist.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            {!selectedPlaylist ? (
              <div className="vintage-card py-10 text-center text-sm text-vintage-ink-muted">
                Select a playlist to see saved videos.
              </div>
            ) : playlistItems.length === 0 ? (
              <div className="vintage-card py-10 text-center text-sm text-vintage-ink-muted">
                This playlist is empty.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {playlistItems.map((item) => (
                  <LibraryVideoCard key={`${item.source}-${item.videoKey}`} video={item} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "uploads" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <VideoUploadForm user={user} />
          <div className="space-y-3">
            <h2 className="font-display text-lg font-semibold text-vintage-ink">Community uploads</h2>
            {uploads.length === 0 ? (
              <div className="vintage-card py-10 text-center text-sm text-vintage-ink-muted">
                No uploads yet. Be the first to share a video.
              </div>
            ) : (
              <div className="grid gap-4">
                {uploads.map((video) => (
                  <LibraryVideoCard
                    key={video.id}
                    video={{
                      videoKey: video.id,
                      source: "upload",
                      title: video.title,
                      channelTitle: user.display_name,
                      thumbnailUrl: video.thumbnail_url,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
