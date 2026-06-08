import { Image, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";

const sizes = { sm: 32, md: 40, lg: 56, xl: 80 } as const;

export function Avatar({
  name,
  avatarUrl,
  size = "md",
}: {
  name: string;
  avatarUrl?: string | null;
  size?: keyof typeof sizes;
}) {
  const px = sizes[size];
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{ width: px, height: px, borderRadius: px / 2 }}
      />
    );
  }

  return (
    <View style={[styles.fallback, { width: px, height: px, borderRadius: px / 2 }]}>
      <Text style={[styles.initial, { fontSize: px * 0.4 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.rust,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    color: colors.btnText,
    fontWeight: "700",
  },
});
