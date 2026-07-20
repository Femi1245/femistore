/** Public Android APK download URL (EAS build or hosted file). */
export function getAndroidApkUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_ANDROID_APK_URL?.trim();
  return url || null;
}

export function isAndroidUserAgent(ua: string): boolean {
  return /android/i.test(ua);
}

export function isIosUserAgent(ua: string): boolean {
  return /iphone|ipad|ipod/i.test(ua);
}
