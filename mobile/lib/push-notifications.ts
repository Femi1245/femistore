import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { apiFetch } from "@/lib/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function getExpoProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId
  );
}

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "Zumelia alerts",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#c45c3e",
  });
}

export async function registerForPushNotifications(
  accessToken: string,
): Promise<string | null> {
  if (!Device.isDevice) return null;

  await ensureAndroidChannel();

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;

  const projectId = getExpoProjectId();
  if (!projectId) {
    console.warn(
      "[push] Missing EAS projectId in app.config.ts extra.eas.projectId — run eas init",
    );
    return null;
  }

  const pushToken = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = pushToken.data;

  const platform = Platform.OS === "ios" ? "ios" : "android";
  const { error } = await apiFetch("/api/push/register", {
    method: "POST",
    token: accessToken,
    body: JSON.stringify({
      token,
      platform,
      deviceId: Constants.sessionId ?? undefined,
    }),
  });

  if (error) {
    console.warn("[push] Token registration failed:", error);
    return null;
  }

  return token;
}

export async function unregisterPushToken(
  accessToken: string,
  token: string,
): Promise<void> {
  await apiFetch("/api/push/register", {
    method: "DELETE",
    token: accessToken,
    body: JSON.stringify({ token }),
  });
}

export { Notifications };
