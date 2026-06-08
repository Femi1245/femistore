import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "@/constants/theme";
import { signInWithOAuthProvider, type OAuthProvider } from "@/lib/oauth";

const providers: {
  id: OAuthProvider;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: "google", label: "Continue with Google", icon: "logo-google" },
  { id: "github", label: "Continue with GitHub", icon: "logo-github" },
  { id: "twitter", label: "Continue with X", icon: "logo-twitter" },
];

export function OAuthButtons({
  onSuccess,
  onError,
  disabled,
}: {
  onSuccess: () => void;
  onError: (message: string) => void;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState<OAuthProvider | null>(null);

  async function handlePress(provider: OAuthProvider) {
    setLoading(provider);
    const result = await signInWithOAuthProvider(provider);
    setLoading(null);

    if (result.cancelled) return;
    if (result.error) {
      onError(result.error);
      return;
    }
    onSuccess();
  }

  return (
    <View style={styles.wrap}>
      {providers.map((p) => {
        const busy = loading === p.id;
        return (
          <Pressable
            key={p.id}
            style={[styles.btn, (disabled || loading) && styles.btnDisabled]}
            onPress={() => handlePress(p.id)}
            disabled={disabled || loading !== null}
          >
            {busy ? (
              <ActivityIndicator color={colors.ink} />
            ) : (
              <Ionicons name={p.icon} size={20} color={colors.ink} />
            )}
            <Text style={styles.label}>{busy ? "Redirecting…" : p.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, marginBottom: spacing.md },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    backgroundColor: colors.paper,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  btnDisabled: { opacity: 0.55 },
  label: { fontWeight: "600", color: colors.ink, fontSize: 15 },
});
