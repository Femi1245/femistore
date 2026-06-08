import type { SupabaseClient } from "@supabase/supabase-js";

export async function uploadMedia(
  supabase: SupabaseClient,
  bucket: "avatars" | "post-media",
  userId: string,
  file: File,
): Promise<{ url: string | null; error?: string }> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: bucket === "avatars",
  });

  if (error) {
    return { url: null, error: error.message };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl };
}
