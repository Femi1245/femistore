import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Zumelia native Android/iOS shell (JavaScript + Capacitor).
 * Opens your live site inside a real app icon — no Chrome address bar.
 *
 * Default production URL: https://itunes-mu.vercel.app
 * Override with CAPACITOR_SERVER_URL if needed.
 */
const serverUrl =
  process.env.CAPACITOR_SERVER_URL?.trim() ||
  "https://itunes-mu.vercel.app/login";

const config: CapacitorConfig = {
  appId: "com.zumelia.app",
  appName: "Zumelia",
  webDir: "public",
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
    allowNavigation: [
      "itunes-mu.vercel.app",
      "*.vercel.app",
      "*.supabase.co",
      "*.livekit.cloud",
    ],
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#FAF8F5",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: "#FAF8F5",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#FAF8F5",
    },
  },
};

export default config;
