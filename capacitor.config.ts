import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native app shell for Zumelia (WebView wrapper).
 *
 * ⚠️ For a real standalone APK, use the Expo app in `mobile/` instead.
 * See MOBILE_APK.md — users open the app directly without a browser.
 *
 * This Capacitor shell loads your deployed website URL. Only use it if you
 * intentionally want a thin WebView around the web app.
 *
 * Deploy your Next.js app first (Vercel, etc.), then set CAPACITOR_SERVER_URL
 * to that HTTPS URL before building Android/iOS packages.
 *
 * Example: CAPACITOR_SERVER_URL=https://your-app.vercel.app
 */
const serverUrl = process.env.CAPACITOR_SERVER_URL;

const config: CapacitorConfig = {
  appId: "com.zumelia.app",
  appName: "Zumelia",
  webDir: "public",
  server: serverUrl
    ? {
        url: serverUrl,
        cleartext: serverUrl.startsWith("http://"),
      }
    : undefined,
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
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
