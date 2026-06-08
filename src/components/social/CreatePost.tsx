"use client";

import { useRef, useState } from "react";
import { ImageIcon, Video, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadMedia } from "@/lib/storage";
import type { Profile } from "@/lib/types";
import { Avatar } from "@/components/Avatar";

export function CreatePost({
  user,
  onPosted,
}: {
  user: Profile;
  onPosted: () => void;
}) {
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(selected: File | null) {
    setFile(selected);
    if (preview) URL.revokeObjectURL(preview);
    if (selected) setPreview(URL.createObjectURL(selected));
    else setPreview(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() && !file) return;

    setLoading(true);
    setError(null);
    const supabase = createClient();

    let mediaUrl: string | null = null;
    let mediaType: "image" | "video" | null = null;

    if (file) {
      mediaType = file.type.startsWith("video/") ? "video" : "image";
      const { url, error: uploadError } = await uploadMedia(
        supabase,
        "post-media",
        user.id,
        file,
      );
      if (uploadError || !url) {
        setError(uploadError ?? "Upload failed");
        setLoading(false);
        return;
      }
      mediaUrl = url;
    }

    const { error: postError } = await supabase.from("posts").insert({
      user_id: user.id,
      content: content.trim(),
      media_url: mediaUrl,
      media_type: mediaType,
    });

    if (postError) {
      setError(postError.message);
      setLoading(false);
      return;
    }

    setContent("");
    handleFile(null);
    if (inputRef.current) inputRef.current.value = "";
    setLoading(false);
    onPosted();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="vintage-card p-4"
    >
      <div className="flex gap-3">
        <Avatar name={user.display_name} avatarUrl={user.avatar_url} />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          rows={3}
          className="vintage-input flex-1 resize-none px-4 py-3"
        />
      </div>

      {preview && (
        <div className="mt-3 overflow-hidden rounded-sm border-2 border-vintage-border">
          {file?.type.startsWith("video/") ? (
            <video src={preview} controls className="max-h-80 w-full" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Preview" className="max-h-80 w-full object-cover" />
          )}
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-vintage-rust">{error}</p>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-2">
          <label className="cursor-pointer rounded-sm p-2 text-vintage-ink-muted hover:bg-vintage-paper-dark hover:text-vintage-ink">
            <ImageIcon className="h-5 w-5" />
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <label className="cursor-pointer rounded-sm p-2 text-vintage-ink-muted hover:bg-vintage-paper-dark hover:text-vintage-ink">
            <Video className="h-5 w-5" />
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={loading || (!content.trim() && !file)}
          className="vintage-btn flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
          {loading ? "Posting…" : "Post"}
        </button>
      </div>
    </form>
  );
}
