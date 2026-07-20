/** Standalone Android APK (Capacitor). Built by GitHub Actions → Releases. */
export const DEFAULT_ANDROID_APK_URL =
  "https://github.com/Femi1245/femistore/releases/latest/download/Zumelia.apk";

export function getAndroidApkUrl(): string {
  return (
    process.env.NEXT_PUBLIC_ANDROID_APK_URL?.trim() || DEFAULT_ANDROID_APK_URL
  );
}
