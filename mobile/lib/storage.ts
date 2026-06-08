import type { SupabaseClient } from "@supabase/supabase-js";
import * as FileSystem from "expo-file-system";

export async function uploadMediaFromUri(
  supabase: SupabaseClient,
  bucket: "avatars" | "post-media",
  userId: string,
  uri: string,
  mimeType: string,
): Promise<{ url: string | null; error?: string }> {
  const ext = mimeType.split("/")[1]?.split("+")[0] ?? "jpg";
  const path = `${userId}/${Date.now()}.${ext}`;

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: "base64",
  });

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType: mimeType,
    cacheControl: "3600",
    upsert: bucket === "avatars",
  });

  if (error) return { url: null, error: error.message };

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl };
}
