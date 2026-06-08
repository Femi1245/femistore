import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Avatar } from "@/components/Avatar";
import { Btn, Loader, Screen, Subtitle, Title } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabase } from "@/lib/supabase";
import type { LiveStream, Profile } from "@/lib/types";

export default function LiveScreen() {
  const { profile } = useAuth();
  const [streams, setStreams] = useState<(LiveStream & { host?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    const { data } = await getSupabase()
      .from("live_streams")
      .select("*")
      .eq("is_live", true)
      .order("started_at", { ascending: false });

    const rows = (data as LiveStream[]) ?? [];
    if (!rows.length) {
      setStreams([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const hostIds = [...new Set(rows.map((s) => s.host_id))];
    const { data: profiles } = await getSupabase()
      .from("profiles")
      .select("*")
      .in("id", hostIds);
    const map = new Map((profiles as Profile[])?.map((p) => [p.id, p]));

    setStreams(rows.map((s) => ({ ...s, host: map.get(s.host_id) })));
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, [refresh]);

  if (!profile) return <Loader />;

  return (
    <Screen>
      <Title>Live</Title>
      <Subtitle>Watch live streams or start your own</Subtitle>
      <Btn label="Go live" onPress={() => router.push("/live/go-live")} />

      <FlatList
        style={{ marginTop: spacing.md }}
        data={streams}
        keyExtractor={(s) => s.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); refresh(); }} />
        }
        ListEmptyComponent={
          loading ? <Loader /> : (
            <Text style={styles.empty}>No one is live right now.</Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push(`/live/${item.room_name}`)}
          >
            <View style={styles.liveBadge}>
              <Text style={styles.liveText}>LIVE</Text>
            </View>
            <Avatar
              name={item.host?.display_name ?? "Host"}
              avatarUrl={item.host?.avatar_url}
            />
            <View style={styles.cardText}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.host}>{item.host?.display_name ?? "Host"}</Text>
            </View>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.paper,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  liveBadge: {
    backgroundColor: colors.rust,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  liveText: { color: colors.btnText, fontSize: 10, fontWeight: "800" },
  cardText: { flex: 1 },
  title: { fontWeight: "700", color: colors.ink },
  host: { fontSize: 13, color: colors.inkMuted },
  empty: { textAlign: "center", color: colors.inkMuted, marginTop: 24 },
});
