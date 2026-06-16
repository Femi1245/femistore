import type { CSSProperties } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { uploadMedia } from "@/lib/storage";
import type { ChatWallpaperType, ConversationMemberSettings } from "@/lib/types";

export async function loadChatTheme(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
): Promise<ConversationMemberSettings | null> {
  const { data } = await supabase
    .from("conversation_member_settings")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  return (data as ConversationMemberSettings | null) ?? null;
}

export async function saveChatTheme(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
  theme: {
    wallpaper_type: ChatWallpaperType;
    wallpaper_color: string | null;
    wallpaper_url: string | null;
  },
): Promise<{ error?: string }> {
  const { error } = await supabase.from("conversation_member_settings").upsert(
    {
      conversation_id: conversationId,
      user_id: userId,
      wallpaper_type: theme.wallpaper_type,
      wallpaper_color: theme.wallpaper_color,
      wallpaper_url: theme.wallpaper_url,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "conversation_id,user_id" },
  );

  if (error) return { error: error.message };
  return {};
}

export async function uploadChatWallpaper(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<{ url: string | null; error?: string }> {
  return uploadMedia(supabase, "chat-wallpapers", userId, file, "wallpapers");
}

export function chatThemeBackgroundStyle(
  theme: ConversationMemberSettings | null,
): CSSProperties {
  if (!theme || theme.wallpaper_type === "default") return {};

  if (theme.wallpaper_type === "color" && theme.wallpaper_color) {
    return { backgroundColor: theme.wallpaper_color };
  }

  if (theme.wallpaper_type === "image" && theme.wallpaper_url) {
    return {
      backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(${theme.wallpaper_url})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "local",
    };
  }

  return {};
}
