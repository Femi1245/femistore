import { Redirect } from "expo-router";
import { View } from "react-native";
import { Loader } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";

export default function Index() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Loader />
      </View>
    );
  }

  if (session) return <Redirect href="/(tabs)/chat" />;
  return <Redirect href="/(auth)/login" />;
}
