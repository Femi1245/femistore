import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native app shell for iTunes.
 *
 * Deploy your Next.js app first (Vercel, etc.), then set CAPACITOR_SERVER_URL
 * to that HTTPS URL before building Android/iOS packages.
 *
 * Example: CAPACITOR_SERVER_URL=https://your-app.vercel.app
 */
const serverUrl = process.env.CAPACITOR_SERVER_URL;

const config: CapacitorConfig = {
  appId: "com.itunes.globalchat",
  appName: "iTunes",
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
      backgroundColor: "#f4e8d4",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#f4e8d4",
    },
  },
};

export default config;
