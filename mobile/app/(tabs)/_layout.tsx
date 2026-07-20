import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { Loader } from "@/components/ui";
import { WelcomeEmailOnAppOpen } from "@/components/WelcomeEmailOnAppOpen";
import { PushNotificationSetup } from "@/components/PushNotificationSetup";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadNotificationCount } from "@/hooks/useUnreadNotificationCount";
import { colors } from "@/constants/theme";

export default function TabsLayout() {
  const { session, loading, profile } = useAuth();
  const { unread, refreshCount } = useUnreadNotificationCount(profile?.id);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Loader />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/login" />;

  return (
    <>
      <WelcomeEmailOnAppOpen accessToken={session.access_token} />
      {profile && (
        <PushNotificationSetup
          userId={profile.id}
          accessToken={session.access_token}
          onUnreadChange={() => void refreshCount()}
        />
      )}
      <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.paper },
        headerTintColor: colors.ink,
        tabBarStyle: {
          backgroundColor: colors.paper,
          borderTopColor: colors.border,
          borderTopWidth: 2,
        },
        tabBarActiveTintColor: colors.rust,
        tabBarInactiveTintColor: colors.inkMuted,
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: "Feed",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="watch"
        options={{
          title: "Watch",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="play-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="live"
        options={{
          title: "Live",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="radio" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="games"
        options={{
          title: "Games",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="game-controller" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          tabBarBadge: unread > 0 ? (unread > 99 ? "99+" : unread) : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
    </>
  );
}
