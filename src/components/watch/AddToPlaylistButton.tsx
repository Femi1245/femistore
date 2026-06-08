"use client";

import { useCallback, useEffect, useState } from "react";
import { ListPlus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { addToPlaylist, createPlaylist, loadPlaylists } from "@/lib/watch";
import type { Playlist, WatchVideo } from "@/lib/types";

export function AddToPlaylistButton({
  userId,
  video,
}: {
  userId: string;
  video: WatchVideo;
}) {
  const [open, setOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await loadPlaylists(createClient(), userId);
    setPlaylists(data);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  async function handleAdd(playlistId: string) {
    const { error } = await addToPlaylist(createClient(), playlistId, video);
    setMessage(error ? error : "Added to playlist");
    setTimeout(() => setMessage(null), 2000);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const { playlist, error } = await createPlaylist(
      createClient(),
      userId,
      newName.trim(),
    );
    if (error || !playlist) {
      setMessage(error ?? "Could not create playlist");
      return;
    }
    setNewName("");
    await handleAdd(playlist.id);
    await refresh();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="vintage-btn-outline flex items-center gap-2 px-4 py-2 text-sm"
      >
        <ListPlus className="h-4 w-4" />
        Save to playlist
      </button>

      {message && (
        <p className="mt-2 text-xs text-vintage-olive">{message}</p>
      )}

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-72 vintage-card p-3 shadow-lg">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-vintage-ink-muted">
            Your playlists
          </p>

          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-vintage-rust" />
            </div>
          ) : playlists.length === 0 ? (
            <p className="py-2 text-sm text-vintage-ink-muted">No playlists yet.</p>
          ) : (
            <ul className="max-h-40 space-y-1 overflow-y-auto">
              {playlists.map((playlist) => (
                <li key={playlist.id}>
                  <button
                    type="button"
                    onClick={() => handleAdd(playlist.id)}
                    className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-vintage-paper-dark"
                  >
                    {playlist.name}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleCreate} className="mt-3 flex gap-2 border-t border-vintage-border pt-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New playlist"
              className="vintage-input flex-1 px-2 py-1.5 text-sm"
            />
            <button type="submit" className="vintage-btn px-3 py-1.5 text-sm">
              Add
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
