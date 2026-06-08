import { useCallback, useEffect, useState } from "react";
import { FlatList, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Loader, Screen, Subtitle, Title } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { loadWatchHistory } from "@/lib/watch";
import { searchVideos } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
import type { WatchHistoryEntry } from "@/lib/types";

type SearchResult = {
  videoId: string;
  title: string;
  channelTitle?: string;
  thumbnailUrl?: string;
};

export default function WatchScreen() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<"search" | "history">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [history, setHistory] = useState<WatchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!profile) return;
    const data = await loadWatchHistory(getSupabase(), profile.id);
    setHistory(data);
  }, [profile]);

  useEffect(() => {
    if (tab === "history") loadHistory();
  }, [tab, loadHistory]);

  async function runSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    const { data, error: apiError } = await searchVideos(query.trim());
    setLoading(false);
    if (apiError) {
      setError(apiError);
      return;
    }
    setResults((data?.videos as SearchResult[]) ?? []);
  }

  function openVideo(videoId: string) {
    Linking.openURL(`https://www.youtube.com/watch?v=${videoId}`);
  }

  if (!profile) return <Loader />;

  return (
    <Screen>
      <Title>Watch</Title>
      <Subtitle>Search videos and view your history</Subtitle>

      <View style={styles.tabs}>
        {(["search", "history"] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabActive]}
          >
            <Text style={tab === t ? styles.tabTextActive : styles.tabText}>
              {t === "search" ? "Search" : "History"}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === "search" && (
        <>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search YouTube…"
            placeholderTextColor={colors.inkMuted}
            style={styles.input}
            onSubmitEditing={runSearch}
          />
          <Pressable style={styles.searchBtn} onPress={runSearch}>
            <Text style={styles.searchBtnText}>Search</Text>
          </Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {loading ? <Loader /> : null}
          <FlatList
            data={results}
            keyExtractor={(v) => v.videoId}
            renderItem={({ item }) => (
              <Pressable style={styles.row} onPress={() => openVideo(item.videoId)}>
                <Text style={styles.videoTitle}>{item.title}</Text>
                <Text style={styles.channel}>{item.channelTitle}</Text>
              </Pressable>
            )}
          />
        </>
      )}

      {tab === "history" && (
        <FlatList
          data={history}
          keyExtractor={(h) => h.id}
          ListEmptyComponent={<Text style={styles.empty}>No watch history yet.</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => {
                if (item.source === "stream" && item.videoKey) {
                  openVideo(item.videoKey);
                }
              }}
            >
              <Text style={styles.videoTitle}>{item.title}</Text>
              <Text style={styles.channel}>{item.channelTitle ?? item.source}</Text>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: 8, marginBottom: spacing.sm },
  tab: { flex: 1, paddingVertical: 8, alignItems: "center", borderWidth: 2, borderColor: colors.border, borderRadius: 4 },
  tabActive: { backgroundColor: colors.rust, borderColor: colors.rustDark },
  tabText: { color: colors.inkMuted, fontWeight: "600" },
  tabTextActive: { color: colors.btnText, fontWeight: "600" },
  input: { borderWidth: 2, borderColor: colors.border, borderRadius: 4, padding: 10, marginBottom: 8, color: colors.ink, backgroundColor: colors.white },
  searchBtn: { backgroundColor: colors.rust, padding: 10, borderRadius: 4, alignItems: "center", marginBottom: spacing.sm },
  searchBtnText: { color: colors.btnText, fontWeight: "600" },
  error: { color: colors.rust, marginBottom: 8 },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  videoTitle: { fontWeight: "600", color: colors.ink },
  channel: { fontSize: 12, color: colors.inkMuted, marginTop: 2 },
  empty: { textAlign: "center", color: colors.inkMuted, marginTop: 24 },
});
