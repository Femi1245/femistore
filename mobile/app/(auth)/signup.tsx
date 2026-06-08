import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import { Link, router } from "expo-router";
import { Btn, ErrorText, Input, Screen } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { validateAuthForm, cleanUsername } from "@/lib/auth-validation";
import { getSupabase } from "@/lib/supabase";

export default function SignupScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    const fieldErrors = validateAuthForm("signup", {
      email,
      password,
      displayName,
      username,
    });
    const first = Object.values(fieldErrors)[0];
    if (first) {
      setError(first);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const { data, error: signUpError } = await getSupabase().auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          display_name: displayName.trim(),
          username: cleanUsername(username),
          country: "Global",
        },
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      router.replace("/(tabs)/chat");
      return;
    }

    setSuccess("Check your email to confirm your account, then sign in.");
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Create account</Text>
          <Input value={displayName} onChangeText={setDisplayName} placeholder="Display name" />
          <Input
            value={username}
            onChangeText={setUsername}
            placeholder="Username"
            autoCapitalize="none"
          />
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
          {success ? <Text style={styles.success}>{success}</Text> : null}
          <Btn label={loading ? "Creating…" : "Sign up"} onPress={handleSignup} disabled={loading} />
          <Text style={styles.footer}>
            Already have an account?{" "}
            <Link href="/(auth)/login" style={styles.link}>
              Sign in
            </Link>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.lg },
  title: { fontSize: 28, fontWeight: "700", color: colors.ink, marginBottom: spacing.md },
  footer: { textAlign: "center", marginTop: spacing.lg, color: colors.inkMuted },
  link: { color: colors.rust, fontWeight: "600" },
  success: { color: colors.ink, marginBottom: spacing.sm },
});
