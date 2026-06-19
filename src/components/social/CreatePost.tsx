"use client";

import { useRef, useState } from "react";
import { ImageIcon, Video, Send, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getPostingLabel } from "@/lib/business";
import { uploadMedia } from "@/lib/storage";
import type { PostContext, Profile } from "@/lib/types";
import { Avatar } from "@/components/Avatar";

export function CreatePost({
  user,
  onPosted,
  postContext = "personal",
  placeholder,
}: {
  user: Profile;
  onPosted: () => void;
  postContext?: PostContext;
  placeholder?: string;
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

    const payload: Record<string, unknown> = {
      user_id: user.id,
      content: content.trim(),
      media_url: mediaUrl,
      media_type: mediaType,
    };
    if (postContext === "business") {
      payload.post_context = "business";
    }

    const { error: postError } = await supabase.from("posts").insert(payload);

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
      {postContext === "business" && user.business_name ? (
        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-vintage-ink-muted">
          Posting as{" "}
          <span className="text-vintage-rust">{user.business_name}</span>
        </p>
      ) : getPostingLabel(user) !== user.display_name ? (
        <p className="mb-3 text-xs text-vintage-ink-muted">
          Posting as{" "}
          <span className="font-semibold text-vintage-rust">{getPostingLabel(user)}</span>
        </p>
      ) : null}
      <div className="flex gap-3">
        <Avatar name={user.display_name} avatarUrl={user.avatar_url} />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            placeholder ??
            (postContext === "business"
              ? "Share a product drop, offer, or business update…"
              : "What's on your mind?")
          }
          rows={3}
          className="vintage-input flex-1 resize-none px-4 py-3"
        />
      </div>

      {preview && (
        <div className="mt-3 pl-0 sm:pl-[60px]">
          <div className="relative overflow-hidden rounded-xl border border-vintage-border">
            {file?.type.startsWith("video/") ? (
              <video src={preview} controls className="max-h-80 w-full" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Preview" className="max-h-80 w-full object-cover" />
            )}
            <button
              type="button"
              onClick={() => handleFile(null)}
              aria-label="Remove media"
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-vintage-rust">{error}</p>
      )}

      <div className="mt-3 flex items-center justify-between pl-0 sm:pl-[60px]">
        <div className="flex gap-1">
          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-vintage-ink-muted transition hover:bg-vintage-rust/10 hover:text-vintage-rust">
            <ImageIcon className="h-5 w-5" />
            <span className="hidden sm:inline">Photo</span>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-vintage-ink-muted transition hover:bg-vintage-rust/10 hover:text-vintage-rust">
            <Video className="h-5 w-5" />
            <span className="hidden sm:inline">Video</span>
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
          className="vintage-btn flex items-center gap-2 px-5 py-2 text-sm disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
          {loading ? "Posting…" : postContext === "business" ? "Publish" : "Post"}
        </button>
      </div>
    </form>
  );
}
