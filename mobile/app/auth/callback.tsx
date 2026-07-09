import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { Loader } from "@/components/ui";
import { createSessionFromUrl } from "@/lib/oauth";
import { ensureProfile } from "@/lib/auth";
import { requestWelcomeEmail } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
import { colors } from "@/constants/theme";

export default function AuthCallbackScreen() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function finish(url: string) {
      try {
        await createSessionFromUrl(url);
        const {
          data: { user },
        } = await getSupabase().auth.getUser();
        if (user) {
          const { isNewUser } = await ensureProfile(getSupabase(), user);
          if (isNewUser) {
            const { data } = await getSupabase().auth.getSession();
            void requestWelcomeEmail(data.session?.access_token);
          }
        }
        router.replace("/(tabs)/chat");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Sign in failed");
      }
    }

    Linking.getInitialURL().then((url) => {
      if (url) finish(url);
    });

    const sub = Linking.addEventListener("url", ({ url }) => {
      if (url.includes("auth/callback")) finish(url);
    });

    return () => sub.remove();
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
        <Text style={{ color: colors.rust, textAlign: "center", marginBottom: 16 }}>{error}</Text>
        <Text style={{ color: colors.rust }} onPress={() => router.replace("/(auth)/login")}>
          Back to sign in
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Loader />
    </View>
  );
}
