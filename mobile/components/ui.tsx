import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { colors, spacing } from "@/constants/theme";

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Title({ children }: { children: string }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Subtitle({ children }: { children: string }) {
  return <Text style={styles.subtitle}>{children}</Text>;
}

export function Btn({
  label,
  onPress,
  disabled,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "outline";
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        variant === "primary" ? styles.btn : styles.btnOutline,
        disabled && styles.btnDisabled,
      ]}
    >
      <Text style={variant === "primary" ? styles.btnText : styles.btnOutlineText}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  return <TextInput {...props} placeholderTextColor={colors.inkMuted} style={[styles.input, props.style]} />;
}

export function Loader() {
  return <ActivityIndicator color={colors.rust} size="large" />;
}

export function ErrorText({ children }: { children: string }) {
  return <Text style={styles.error}>{children}</Text>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.paper,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.inkMuted,
    marginBottom: spacing.md,
  },
  btn: {
    backgroundColor: colors.rust,
    borderWidth: 2,
    borderColor: colors.rustDark,
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  btnOutline: {
    backgroundColor: colors.paper,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  btnText: {
    color: colors.btnText,
    fontWeight: "600",
  },
  btnOutlineText: {
    color: colors.ink,
    fontWeight: "600",
  },
  btnDisabled: {
    opacity: 0.5,
  },
  input: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    backgroundColor: colors.white,
    color: colors.ink,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: spacing.sm,
  },
  error: {
    color: colors.rust,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
});
