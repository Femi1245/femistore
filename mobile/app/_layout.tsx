import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/contexts/AuthContext";
import { colors } from "@/constants/theme";

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.paper },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: colors.cream },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false, title: "Signing in" }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="profile/[username]" options={{ title: "Profile" }} />
        <Stack.Screen name="profile/edit" options={{ title: "Edit profile" }} />
        <Stack.Screen name="live/go-live" options={{ title: "Go live" }} />
        <Stack.Screen name="live/[room]" options={{ title: "Live" }} />
      </Stack>
    </AuthProvider>
  );
}
