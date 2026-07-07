import type { ConfigContext, ExpoConfig } from "expo/config";

function createExpoConfig({ config }: ConfigContext): ExpoConfig {
  return {
    ...config,
    name: "Zumelia",
    slug: "zumelia",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    scheme: "zumelia",
    userInterfaceStyle: "light",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.zumelia.app",
    },
    android: {
      package: "com.zumelia.app",
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: "./assets/icon.png",
        backgroundColor: "#f4e8d4",
      },
      intentFilters: [
        {
          action: "VIEW",
          category: ["BROWSABLE", "DEFAULT"],
          data: [{ scheme: "zumelia" }],
        },
      ],
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      [
        "expo-image-picker",
        {
          photosPermission:
            "Allow Zumelia to access your photos for posts and profile pictures.",
        },
      ],
      "expo-web-browser",
      "expo-image",
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {},
  };
}

export default createExpoConfig;
