import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Zumelia native Android/iOS shell (JavaScript + Capacitor).
 * Opens your live site inside a real app icon — no Chrome address bar.
 *
 * IMPORTANT: server.url MUST be origin-only (no path/query). Capacitor Android
 * injects the native bridge via DOCUMENT_START_SCRIPT only for that origin.
 * A path like /login?native=1 breaks plugin detection (Browser/App unavailable).
 *
 * Override with CAPACITOR_SERVER_URL if needed (still use origin only).
 */
const rawServer =
  process.env.CAPACITOR_SERVER_URL?.trim() ||
  "https://itunes-mu.vercel.app";

function originOnly(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.origin;
  } catch {
    return "https://itunes-mu.vercel.app";
  }
}

const serverUrl = originOnly(rawServer);

const config: CapacitorConfig = {
  appId: "com.zumelia.app",
  appName: "Zumelia",
  webDir: "public",
  // APK build: 20260722g — native phone notification tray alerts
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
    allowNavigation: [
      "itunes-mu.vercel.app",
      "*.vercel.app",
      "*.supabase.co",
      "*.livekit.cloud",
      // OAuth hosts — Custom Tab / WebView safety
      "accounts.google.com",
      "*.google.com",
      "github.com",
      "*.github.com",
      "twitter.com",
      "x.com",
      "*.twitter.com",
    ],
  },
  android: {
    allowMixedContent: false,
    // Match dark default theme so the WebView letterbox isn't a cream flash.
    backgroundColor: "#141414",
    appendUserAgent: " ZumeliaNativeApp/1",
  },
  ios: {
    appendUserAgent: " ZumeliaNativeApp/1",
    backgroundColor: "#141414",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: "#141414",
      showSpinner: false,
    },
    StatusBar: {
      // Light icons for dark chrome; JS NativeStatusBar keeps this in sync.
      style: "LIGHT",
      backgroundColor: "#00000000",
      overlaysWebView: true,
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#C45C26",
      sound: "default",
    },
  },
};

export default config;
