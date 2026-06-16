"use client";

import { useEffect, useState } from "react";
import { ImageIcon, Loader2, Palette, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { loadChatTheme, saveChatTheme, uploadChatWallpaper } from "@/lib/chat-themes";
import type { ChatWallpaperType, ConversationMemberSettings } from "@/lib/types";

const PRESET_COLORS = [
  "#0b0b0d",
  "#1c1917",
  "#1e3a5f",
  "#312e81",
  "#4c1d95",
  "#831843",
  "#7f1d1d",
  "#14532d",
  "#e0613a",
  "#f4f4f5",
];

export function ChatThemeModal({
  userId,
  conversationId,
  onClose,
  onSaved,
}: {
  userId: string;
  conversationId: string;
  onClose: () => void;
  onSaved: (theme: ConversationMemberSettings) => void;
}) {
  const [wallpaperType, setWallpaperType] = useState<ChatWallpaperType>("default");
  const [color, setColor] = useState("#1e3a5f");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadChatTheme(createClient(), userId, conversationId).then((theme) => {
      if (theme) {
        setWallpaperType(theme.wallpaper_type);
        if (theme.wallpaper_color) setColor(theme.wallpaper_color);
        if (theme.wallpaper_url) setImageUrl(theme.wallpaper_url);
      }
      setLoading(false);
    });
  }, [userId, conversationId]);

  async function handleImageUpload(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError(null);
    const { url, error: uploadError } = await uploadChatWallpaper(
      createClient(),
      userId,
      file,
    );
    setUploading(false);
    if (uploadError || !url) {
      setError(uploadError ?? "Upload failed");
      return;
    }
    setImageUrl(url);
    setWallpaperType("image");
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    const payload = {
      wallpaper_type: wallpaperType,
      wallpaper_color: wallpaperType === "color" ? color : null,
      wallpaper_url: wallpaperType === "image" ? imageUrl : null,
    };

    const { error: saveError } = await saveChatTheme(
      createClient(),
      userId,
      conversationId,
      payload,
    );

    setSaving(false);
    if (saveError) {
      setError(saveError);
      return;
    }

    onSaved({
      conversation_id: conversationId,
      user_id: userId,
      ...payload,
      updated_at: new Date().toISOString(),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
      <div className="vintage-card w-full max-w-md p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-vintage-rust" />
            <h2 className="font-display text-lg font-bold">Chat theme</h2>
          </div>
          <button type="button" onClick={onClose} className="text-vintage-ink-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-vintage-ink-muted">
          Only you see this wallpaper — it&apos;s personal to your view of this chat.
        </p>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-vintage-rust" />
          </div>
        ) : (
          <>
            <div className="mb-4 flex gap-2">
              {(
                [
                  ["default", "Default"],
                  ["color", "Color"],
                  ["image", "Image"],
                ] as const
              ).map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setWallpaperType(type)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    wallpaperType === type
                      ? "bg-vintage-rust/15 text-vintage-rust"
                      : "vintage-card-inset text-vintage-ink-muted hover:text-vintage-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {wallpaperType === "color" && (
              <div className="mb-4 space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-vintage-border bg-transparent"
                  />
                  <input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="vintage-input flex-1 px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="h-8 w-8 rounded-lg border border-vintage-border"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            )}

            {wallpaperType === "image" && (
              <div className="mb-4 space-y-3">
                {imageUrl && (
                  <div
                    className="h-32 rounded-xl border border-vintage-border bg-cover bg-center"
                    style={{ backgroundImage: `url(${imageUrl})` }}
                  />
                )}
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg vintage-card-inset px-4 py-3 text-sm font-medium text-vintage-ink-muted transition hover:text-vintage-rust">
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImageIcon className="h-4 w-4" />
                  )}
                  {uploading ? "Uploading…" : "Choose wallpaper image"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => handleImageUpload(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            )}

            {wallpaperType !== "default" && (
              <div
                className="mb-4 h-24 rounded-xl border border-vintage-border"
                style={
                  wallpaperType === "color"
                    ? { backgroundColor: color }
                    : imageUrl
                      ? {
                          backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(${imageUrl})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : undefined
                }
              />
            )}
          </>
        )}

        {error && <p className="mb-2 text-xs text-vintage-rust">{error}</p>}

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="vintage-btn-outline flex-1 py-2 text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading || (wallpaperType === "image" && !imageUrl)}
            className="vintage-btn flex flex-1 items-center justify-center gap-2 py-2 text-sm disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save theme
          </button>
        </div>
      </div>
    </div>
  );
}
