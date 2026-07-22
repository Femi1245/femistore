/** Standalone Android APK (Capacitor). Built by GitHub Actions → Releases. */

/** Bump this whenever a new APK is published so browsers don't keep an old file. */
export const ANDROID_APK_CACHE_BUST = "20260722b";

/** Direct tag URL (more reliable than /releases/latest for some clients). */
export const DEFAULT_ANDROID_APK_URL =
  "https://github.com/Femi1245/femistore/releases/download/android-latest/Zumelia.apk";

export const ANDROID_RELEASES_PAGE =
  "https://github.com/Femi1245/femistore/releases/tag/android-latest";

export function getAndroidApkUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_ANDROID_APK_URL?.trim() || DEFAULT_ANDROID_APK_URL;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}v=${ANDROID_APK_CACHE_BUST}`;
}

export function getAndroidApkLabel(): string {
  return `Zumelia.apk (update ${ANDROID_APK_CACHE_BUST})`;
}
