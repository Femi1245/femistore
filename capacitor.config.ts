import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native app shell for Zumelia.
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
