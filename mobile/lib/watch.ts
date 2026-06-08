import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Playlist,
  PlaylistItem,
  UserVideo,
  VideoSource,
  WatchHistoryEntry,
  WatchVideo,
} from "./types";

function watchHref(source: VideoSource, videoKey: string) {
  return source === "upload" ? `/watch/upload/${videoKey}` : `/watch/${videoKey}`;
}

export function getWatchHref(video: Pick<WatchVideo, "source" | "videoKey">) {
  return watchHref(video.source, video.videoKey);
}

export async function recordWatchHistory(
  supabase: SupabaseClient,
  userId: string,
  video: WatchVideo,
): Promise<void> {
  await supabase.from("watch_history").upsert(
    {
      user_id: userId,
      video_key: video.videoKey,
      source: video.source,
      title: video.title,
      channel_title: video.channelTitle ?? null,
      thumbnail_url: video.thumbnailUrl ?? null,
      watched_at: new Date().toISOString(),
    },
    { onConflict: "user_id,video_key,source" },
  );
}

export async function loadWatchHistory(
  supabase: SupabaseClient,
  userId: string,
): Promise<WatchHistoryEntry[]> {
  const { data, error } = await supabase
    .from("watch_history")
    .select("*")
    .eq("user_id", userId)
    .order("watched_at", { ascending: false })
    .limit(30);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    videoKey: row.video_key,
    source: row.source as VideoSource,
    title: row.title,
    channelTitle: row.channel_title,
    thumbnailUrl: row.thumbnail_url,
    watchedAt: row.watched_at,
  }));
}

export async function loadPlaylists(
  supabase: SupabaseClient,
  userId: string,
): Promise<Playlist[]> {
  const { data, error } = await supabase
    .from("playlists")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as Playlist[];
}

export async function createPlaylist(
  supabase: SupabaseClient,
  userId: string,
  name: string,
): Promise<{ playlist: Playlist | null; error?: string }> {
  const { data, error } = await supabase
    .from("playlists")
    .insert({ user_id: userId, name: name.trim() })
    .select()
    .single();

  if (error) return { playlist: null, error: error.message };
  return { playlist: data as Playlist };
}

export async function loadPlaylistItems(
  supabase: SupabaseClient,
  playlistId: string,
): Promise<PlaylistItem[]> {
  const { data, error } = await supabase
    .from("playlist_items")
    .select("*")
    .eq("playlist_id", playlistId)
    .order("position", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    playlist_id: row.playlist_id,
    videoKey: row.video_key,
    source: row.source as VideoSource,
    title: row.title,
    channelTitle: row.channel_title,
    thumbnailUrl: row.thumbnail_url,
    position: row.position,
    added_at: row.added_at,
  }));
}

export async function addToPlaylist(
  supabase: SupabaseClient,
  playlistId: string,
  video: WatchVideo,
): Promise<{ error?: string }> {
  const { count } = await supabase
    .from("playlist_items")
    .select("*", { count: "exact", head: true })
    .eq("playlist_id", playlistId);

  const { error } = await supabase.from("playlist_items").upsert(
    {
      playlist_id: playlistId,
      video_key: video.videoKey,
      source: video.source,
      title: video.title,
      channel_title: video.channelTitle ?? null,
      thumbnail_url: video.thumbnailUrl ?? null,
      position: count ?? 0,
    },
    { onConflict: "playlist_id,video_key,source" },
  );

  return error ? { error: error.message } : {};
}

export async function loadUserVideos(
  supabase: SupabaseClient,
): Promise<UserVideo[]> {
  const { data, error } = await supabase
    .from("user_videos")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(40);

  if (error || !data) return [];

  return data.map((row) => ({
    ...(row as UserVideo),
    video_url: supabase.storage.from("user-videos").getPublicUrl(row.storage_path)
      .data.publicUrl,
  }));
}

export async function uploadUserVideo(
  supabase: SupabaseClient,
  userId: string,
  file: File,
  title: string,
  description: string,
): Promise<{ video: UserVideo | null; error?: string }> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "mp4";
  const storagePath = `${userId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("user-videos")
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    return { video: null, error: uploadError.message };
  }

  const { data, error } = await supabase
    .from("user_videos")
    .insert({
      user_id: userId,
      title: title.trim(),
      description: description.trim(),
      storage_path: storagePath,
    })
    .select()
    .single();

  if (error) {
    return { video: null, error: error.message };
  }

  const video = data as UserVideo;
  return {
    video: {
      ...video,
      video_url: supabase.storage.from("user-videos").getPublicUrl(storagePath)
        .data.publicUrl,
    },
  };
}

export async function getUserVideo(
  supabase: SupabaseClient,
  id: string,
): Promise<UserVideo | null> {
  const { data, error } = await supabase
    .from("user_videos")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as UserVideo;
  return {
    ...row,
    video_url: supabase.storage.from("user-videos").getPublicUrl(row.storage_path)
      .data.publicUrl,
  };
}

export function isWatchTablesMissing(error: { code?: string; message?: string }) {
  return error.code === "PGRST205" || error.message?.includes("watch_history");
}
