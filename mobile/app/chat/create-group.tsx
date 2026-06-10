import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Avatar } from "@/components/Avatar";
import { Btn, ErrorText, Screen, Title } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { createGroup, loadMutualFriends } from "@/lib/chat";
import { getSupabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";

export default function CreateGroupScreen() {
  const { profile } = useAuth();
  const [name, setName] = useState("");
  const [friends, setFriends] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) loadMutualFriends(getSupabase(), profile.id).then(setFriends);
  }, [profile]);

  async function submit() {
    if (!profile) return;
    setLoading(true);
    setError(null);
    const { convId, error: createError } = await createGroup(
      getSupabase(),
      profile.id,
      name,
      [...selected],
    );
    setLoading(false);
    if (createError || !convId) {
      setError(createError ?? "Could not create group.");
      return;
    }
    router.replace("/(tabs)/chat");
  }

  return (
    <Screen>
      <Title>Create group</Title>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Group name"
        placeholderTextColor={colors.inkMuted}
        style={styles.input}
      />
      <Text style={styles.label}>Add mutual friends</Text>
      <FlatList
        data={friends}
        keyExtractor={(f) => f.id}
        renderItem={({ item }) => {
          const on = selected.has(item.id);
          return (
            <Pressable
              style={styles.row}
              onPress={() =>
                setSelected((prev) => {
                  const next = new Set(prev);
                  if (on) next.delete(item.id);
                  else next.add(item.id);
                  return next;
                })
              }
            >
              <Avatar name={item.display_name} avatarUrl={item.avatar_url} size="sm" />
              <Text style={styles.name}>{item.display_name}</Text>
              <Text style={on ? styles.checkOn : styles.checkOff}>{on ? "✓" : ""}</Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>Connect with friends first.</Text>}
      />
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Btn label={loading ? "Creating…" : "Create group"} onPress={submit} disabled={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 2, borderColor: colors.border, borderRadius: 4, padding: 10, marginBottom: spacing.sm, color: colors.ink },
  label: { fontSize: 12, color: colors.inkMuted, marginBottom: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  name: { flex: 1, color: colors.ink, fontWeight: "600" },
  checkOn: { color: colors.rust, fontWeight: "800", fontSize: 18 },
  checkOff: { width: 18 },
  empty: { color: colors.inkMuted, textAlign: "center", marginVertical: 16 },
});
