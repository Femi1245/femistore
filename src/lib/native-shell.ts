/**
 * Detect Zumelia running as an installed app (Capacitor APK or PWA home-screen).
 * Used to hide "download / install" UI inside the app itself.
 */

export function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (
    window as Window & {
      Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
    }
  ).Capacitor;
  if (cap?.isNativePlatform?.()) return true;
  // Some WebView builds expose platform without isNativePlatform
  const platform = cap?.getPlatform?.();
  if (platform === "android" || platform === "ios") return true;
  return false;
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if (window.matchMedia("(display-mode: fullscreen)").matches) return true;
  if (window.matchMedia("(display-mode: minimal-ui)").matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

/** True when the user is already inside the installed app — never show install prompts. */
export function isInstalledAppShell(): boolean {
  return isCapacitorNative() || isStandaloneDisplay();
}
