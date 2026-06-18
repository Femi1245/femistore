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
  const { error } = await upsertMemberSettings(supabase, userId, conversationId, theme);
  if (error) return { error };
  return {};
}

function defaultMemberFields(
  existing: ConversationMemberSettings | null,
): Omit<ConversationMemberSettings, "conversation_id" | "user_id" | "updated_at"> {
  return {
    wallpaper_type: existing?.wallpaper_type ?? "default",
    wallpaper_color: existing?.wallpaper_color ?? null,
    wallpaper_url: existing?.wallpaper_url ?? null,
    is_pinned: existing?.is_pinned ?? false,
    pinned_at: existing?.pinned_at ?? null,
    is_archived: existing?.is_archived ?? false,
    archived_at: existing?.archived_at ?? null,
    translation_enabled: existing?.translation_enabled ?? false,
    translation_target_lang: existing?.translation_target_lang ?? "en",
    notifications_muted: existing?.notifications_muted ?? false,
    last_read_at: existing?.last_read_at ?? null,
    folder_id: existing?.folder_id ?? null,
  };
}

export const MAX_PINNED_CONVERSATIONS = 3;

export async function countPinnedConversations(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count } = await supabase
    .from("conversation_member_settings")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_pinned", true);

  return count ?? 0;
}

export async function upsertMemberSettings(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
  patch: Partial<{
    wallpaper_type: ChatWallpaperType;
    wallpaper_color: string | null;
    wallpaper_url: string | null;
    is_pinned: boolean;
    is_archived: boolean;
    translation_enabled: boolean;
    translation_target_lang: string;
  }>,
): Promise<{ error?: string; settings?: ConversationMemberSettings }> {
  const existing = await loadChatTheme(supabase, userId, conversationId);
  const base = defaultMemberFields(existing);
  const now = new Date().toISOString();

  const payload = {
    conversation_id: conversationId,
    user_id: userId,
    wallpaper_type: patch.wallpaper_type ?? base.wallpaper_type,
    wallpaper_color:
      patch.wallpaper_color !== undefined ? patch.wallpaper_color : base.wallpaper_color,
    wallpaper_url:
      patch.wallpaper_url !== undefined ? patch.wallpaper_url : base.wallpaper_url,
    is_pinned: patch.is_pinned ?? base.is_pinned,
    pinned_at:
      patch.is_pinned === true ? now : patch.is_pinned === false ? null : base.pinned_at,
    is_archived: patch.is_archived ?? base.is_archived,
    archived_at:
      patch.is_archived === true ? now : patch.is_archived === false ? null : base.archived_at,
    translation_enabled: patch.translation_enabled ?? base.translation_enabled,
    translation_target_lang: patch.translation_target_lang ?? base.translation_target_lang,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("conversation_member_settings")
    .upsert(payload, { onConflict: "conversation_id,user_id" })
    .select()
    .single();

  if (error) return { error: error.message };
  return { settings: data as ConversationMemberSettings };
}

export async function setConversationPinned(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
  pinned: boolean,
): Promise<{ error?: string; settings?: ConversationMemberSettings }> {
  if (pinned) {
    const existing = await loadChatTheme(supabase, userId, conversationId);
    if (!existing?.is_pinned) {
      const pinnedCount = await countPinnedConversations(supabase, userId);
      if (pinnedCount >= MAX_PINNED_CONVERSATIONS) {
        return {
          error: `You can pin up to ${MAX_PINNED_CONVERSATIONS} chats. Unpin one first.`,
        };
      }
    }
  }
  return upsertMemberSettings(supabase, userId, conversationId, { is_pinned: pinned });
}

export async function setConversationArchived(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
  archived: boolean,
) {
  return upsertMemberSettings(supabase, userId, conversationId, { is_archived: archived });
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
