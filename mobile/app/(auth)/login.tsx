import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import { Link, router } from "expo-router";
import iconImage from "@/assets/icon.png";
import { OAuthButtons } from "@/components/OAuthButtons";
import { Btn, ErrorText, Input, Screen } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { ensureProfile } from "@/lib/auth";
import { validateAuthForm } from "@/lib/auth-validation";
import { requestWelcomeEmail } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    const fieldErrors = validateAuthForm("login", {
      email,
      password,
      displayName: "",
      username: "",
    });
    const first = Object.values(fieldErrors)[0];
    if (first) {
      setError(first);
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = getSupabase();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const result = await ensureProfile(supabase, data.user);
      if (result.error) setError(result.error);
      else void requestWelcomeEmail(data.session?.access_token);
    }

    setLoading(false);
    router.replace("/(tabs)/chat");
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- React Native Image uses accessibilityLabel */}
          <Image source={iconImage} style={styles.logo} accessibilityLabel="Zumelia" />
          <Text style={styles.brand}>Zumelia</Text>
          <Text style={styles.tagline}>Connect and chat worldwide</Text>

          <OAuthButtons
            disabled={loading}
            onSuccess={() => router.replace("/(tabs)/chat")}
            onError={setError}
          />

          <Text style={styles.divider}>or sign in with email</Text>

          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Input
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
          />
          {error ? <ErrorText>{error}</ErrorText> : null}
          <Btn label={loading ? "Signing in…" : "Sign in"} onPress={handleLogin} disabled={loading} />

          <Text style={styles.footer}>
            New here?{" "}
            <Link href="/(auth)/signup" style={styles.link}>
              Create account
            </Link>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.xl },
  logo: { width: 72, height: 72, alignSelf: "center", marginBottom: spacing.sm },
  brand: { fontSize: 32, fontWeight: "800", textAlign: "center", color: colors.rust },
  tagline: { textAlign: "center", color: colors.inkMuted, marginBottom: spacing.md },
  divider: {
    textAlign: "center",
    color: colors.inkMuted,
    fontSize: 12,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  footer: { textAlign: "center", marginTop: spacing.lg, color: colors.inkMuted },
  link: { color: colors.rust, fontWeight: "600" },
});
