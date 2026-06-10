import { useState } from "react";
import { StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Btn, ErrorText, Screen, Title } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { createChannel } from "@/lib/chat";
import { getSupabase } from "@/lib/supabase";

export default function CreateChannelScreen() {
  const { profile } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!profile) return;
    setLoading(true);
    setError(null);
    const { convId, error: createError } = await createChannel(
      getSupabase(),
      profile.id,
      name,
      description,
      isPublic,
    );
    setLoading(false);
    if (createError || !convId) {
      setError(createError ?? "Could not create channel.");
      return;
    }
    router.replace("/(tabs)/chat");
  }

  return (
    <Screen>
      <Title>Create channel</Title>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Channel name"
        placeholderTextColor={colors.inkMuted}
        style={styles.input}
      />
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Description"
        placeholderTextColor={colors.inkMuted}
        style={[styles.input, styles.area]}
        multiline
      />
      <View style={styles.row}>
        <Text style={styles.label}>Public channel</Text>
        <Switch value={isPublic} onValueChange={setIsPublic} />
      </View>
      <Text style={styles.hint}>Only you (owner) can post. Others subscribe and read.</Text>
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Btn label={loading ? "Creating…" : "Create channel"} onPress={submit} disabled={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 2, borderColor: colors.border, borderRadius: 4, padding: 10, marginBottom: spacing.sm, color: colors.ink },
  area: { minHeight: 80, textAlignVertical: "top" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  label: { color: colors.ink, fontWeight: "600" },
  hint: { fontSize: 12, color: colors.inkMuted, marginBottom: spacing.md },
});
