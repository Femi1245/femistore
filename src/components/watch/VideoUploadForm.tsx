"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadUserVideo } from "@/lib/watch";
import type { Profile } from "@/lib/types";

export function VideoUploadForm({ user }: { user: Profile }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file || !title.trim()) {
      setError("Choose a video file and enter a title.");
      return;
    }

    if (!file.type.startsWith("video/")) {
      setError("Please select a video file (MP4, WebM, etc.).");
      return;
    }

    setLoading(true);
    setError(null);

    const { video, error: uploadError } = await uploadUserVideo(
      createClient(),
      user.id,
      file,
      title,
      description,
    );

    setLoading(false);

    if (!video) {
      setError(
        uploadError?.includes("user_videos")
          ? "Run supabase/watch-schema.sql in your Supabase SQL Editor first."
          : uploadError ?? "Upload failed.",
      );
      return;
    }

    router.push(`/watch/upload/${video.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="vintage-card space-y-4 p-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-vintage-ink">
          Upload to iTunes Watch
        </h2>
        <p className="mt-1 text-sm text-vintage-ink-muted">
          Share your own videos — they play directly from iTunes, not an external embed.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-vintage-ink-muted">
          Title
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="vintage-input w-full px-4 py-2.5"
          placeholder="My video title"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-vintage-ink-muted">
          Description (optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="vintage-input min-h-24 w-full px-4 py-2.5"
          placeholder="What is this video about?"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-vintage-ink-muted">
          Video file
        </label>
        <input
          type="file"
          accept="video/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="vintage-input w-full px-4 py-2.5 file:mr-3 file:rounded-sm file:border-0 file:bg-vintage-rust file:px-3 file:py-1 file:text-sm file:text-[var(--vintage-btn-text)]"
          required
        />
      </div>

      {error && (
        <p className="text-sm text-vintage-rust">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="vintage-btn flex w-full items-center justify-center gap-2 py-3 disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading…
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            Upload video
          </>
        )}
      </button>
    </form>
  );
}
