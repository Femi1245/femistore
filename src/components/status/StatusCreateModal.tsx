"use client";

import { FormEvent, useState } from "react";
import { Image as ImageIcon, Loader2, Type, Video, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  STATUS_BACKGROUNDS,
  createStatus,
  uploadStatusMedia,
} from "@/lib/status";
import type { StatusMediaType } from "@/lib/types";

export function StatusCreateModal({
  userId,
  onClose,
  onCreated,
}: {
  userId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [mode, setMode] = useState<StatusMediaType>("text");
  const [text, setText] = useState("");
  const [background, setBackground] = useState(STATUS_BACKGROUNDS[0]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    try {
      if (mode === "text") {
        if (!text.trim()) {
          setError("Write something for your status.");
          setLoading(false);
          return;
        }

        const { error: createError } = await createStatus(supabase, userId, {
          content: text.trim(),
          mediaType: "text",
          backgroundColor: background,
        });

        if (createError) throw new Error(createError);
      } else {
        if (!file) {
          setError("Choose a photo or video.");
          setLoading(false);
          return;
        }

        const { url, error: uploadError } = await uploadStatusMedia(
          supabase,
          userId,
          file,
        );

        if (!url) throw new Error(uploadError ?? "Upload failed");

        const { error: createError } = await createStatus(supabase, userId, {
          content: text.trim(),
          mediaUrl: url,
          mediaType: mode,
        });

        if (createError) throw new Error(createError);
      }

      onCreated();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not post status";
      setError(
        message.includes("status_updates")
          ? "Run supabase/status-schema.sql in Supabase SQL Editor first."
          : message,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4">
      <div className="vintage-card w-full max-w-md p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-vintage-ink">Add status</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm p-1 text-vintage-ink-muted hover:bg-vintage-paper-dark"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-vintage-ink-muted">
          Status disappears after 24 hours. Friends you follow can see it.
        </p>

        <div className="mb-4 flex gap-2">
          {([
            ["text", Type, "Text"],
            ["image", ImageIcon, "Photo"],
            ["video", Video, "Video"],
          ] as const).map(([value, Icon, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-sm px-3 py-2 text-sm font-semibold ${
                mode === value
                  ? "bg-vintage-rust text-[var(--vintage-btn-text)]"
                  : "vintage-btn-outline"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "text" && (
            <>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={280}
                placeholder="What's on your mind?"
                className="vintage-input min-h-28 w-full px-4 py-3"
                style={{ backgroundColor: background, color: "#fff8f0" }}
              />
              <div className="flex flex-wrap gap-2">
                {STATUS_BACKGROUNDS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setBackground(color)}
                    className={`h-8 w-8 rounded-full border-2 ${
                      background === color ? "border-vintage-ink" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`Background ${color}`}
                  />
                ))}
              </div>
            </>
          )}

          {mode !== "text" && (
            <>
              <input
                type="file"
                accept={mode === "image" ? "image/*" : "video/*"}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="vintage-input w-full px-4 py-2.5 file:mr-3 file:rounded-sm file:border-0 file:bg-vintage-rust file:px-3 file:py-1 file:text-sm file:text-[var(--vintage-btn-text)]"
              />
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Optional caption"
                className="vintage-input w-full px-4 py-2.5"
                maxLength={280}
              />
            </>
          )}

          {error && <p className="text-sm text-vintage-rust">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="vintage-btn flex w-full items-center justify-center gap-2 py-3 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Posting…
              </>
            ) : (
              "Share status"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
