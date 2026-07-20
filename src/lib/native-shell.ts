/**
 * Detect Zumelia running as an installed app (Capacitor APK or PWA home-screen).
 * Used to hide "download / install" UI inside the app itself.
 */

const NATIVE_FLAG = "zumelia-native-shell";

function readPersistedNativeFlag(): boolean {
  try {
    return window.localStorage.getItem(NATIVE_FLAG) === "1";
  } catch {
    return false;
  }
}

function persistNativeFlag(): void {
  try {
    window.localStorage.setItem(NATIVE_FLAG, "1");
  } catch {
    // ignore
  }
}

/** Call once on app boot (also from early head script). */
export function markNativeShell(): void {
  if (typeof window === "undefined") return;
  persistNativeFlag();
}

export function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (
    window as Window & {
      Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
    }
  ).Capacitor;
  if (cap?.isNativePlatform?.()) return true;
  const platform = cap?.getPlatform?.();
  if (platform === "android" || platform === "ios") return true;
  // Capacitor config appendUserAgent: "ZumeliaNativeApp/1"
  if (/ZumeliaNativeApp/i.test(window.navigator.userAgent)) return true;
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

function hasNativeQueryFlag(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("native") === "1" || params.get("app") === "native";
  } catch {
    return false;
  }
}

/** True when the user is already inside the installed app — never show install prompts. */
export function isInstalledAppShell(): boolean {
  if (typeof window === "undefined") return false;

  if (hasNativeQueryFlag()) {
    persistNativeFlag();
    return true;
  }
  if (isCapacitorNative()) {
    persistNativeFlag();
    return true;
  }
  if (isStandaloneDisplay()) {
    persistNativeFlag();
    return true;
  }
  return readPersistedNativeFlag();
}

/** Inline script for <head> — runs before React so install UI never flashes. */
export const NATIVE_SHELL_BOOT_SCRIPT = `(function(){try{var k="zumelia-native-shell";var q=location.search||"";var ua=navigator.userAgent||"";var native=q.indexOf("native=1")>=0||q.indexOf("app=native")>=0||/ZumeliaNativeApp/i.test(ua)||(window.Capacitor&&((window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform())||window.Capacitor.getPlatform&&(window.Capacitor.getPlatform()==="android"||window.Capacitor.getPlatform()==="ios")))||window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===true;if(native){localStorage.setItem(k,"1");document.documentElement.setAttribute("data-zumelia-native","1")}else if(localStorage.getItem(k)==="1"){document.documentElement.setAttribute("data-zumelia-native","1")}}catch(e){}})();`;
