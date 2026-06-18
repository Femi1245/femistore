import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_IMAGE_DIMENSION = 1920;
const JPEG_QUALITY = 0.88;

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }
  if (file.size < 400_000) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          resolve(
            new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
              type: "image/jpeg",
              lastModified: Date.now(),
            }),
          );
        },
        "image/jpeg",
        JPEG_QUALITY,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

export async function uploadMedia(
  supabase: SupabaseClient,
  bucket: "avatars" | "post-media" | "voice-messages" | "chat-wallpapers" | "business-media",
  userId: string,
  file: File,
  subfolder?: string,
): Promise<{ url: string | null; error?: string }> {
  const uploadFile =
    bucket === "avatars" || bucket === "post-media" || bucket === "business-media"
      ? await compressImage(file)
      : file;

  const ext = uploadFile.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = subfolder
    ? `${userId}/${subfolder}/${Date.now()}.${ext}`
    : `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, uploadFile, {
    cacheControl: "3600",
    upsert: bucket === "avatars",
  });

  if (error) {
    return { url: null, error: error.message };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl };
}
