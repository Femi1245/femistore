import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PostCard } from "@/components/PostCard";
import { Loader, Screen, Subtitle, Title } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { loadPostById } from "@/lib/social";
import { getSupabase } from "@/lib/supabase";
import type { PostWithMeta } from "@/lib/types";

export default function PostDetailScreen() {
  const { id, comments } = useLocalSearchParams<{
    id: string;
    comments?: string;
  }>();
  const { profile } = useAuth();
  const [post, setPost] = useState<PostWithMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  const refresh = useCallback(async () => {
    if (!profile || !id) return;
    setLoading(true);
    const data = await loadPostById(getSupabase(), id, profile.id);
    setPost(data);
    setMissing(!data);
    setLoading(false);
  }, [profile, id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!profile) return <Loader />;

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <View style={styles.headerText}>
          <Title>Post</Title>
          <Subtitle>From your notifications</Subtitle>
        </View>
      </View>

      {loading ? (
        <Loader />
      ) : missing || !post ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Post not found</Text>
          <Text style={styles.emptyBody}>
            It may have been deleted, or you no longer have access.
          </Text>
          <Pressable
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.push("/(tabs)/notifications");
            }}
          >
            <Text style={styles.link}>Go back</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <PostCard
            post={post}
            currentUser={profile}
            onUpdate={refresh}
            initialShowComments={comments === "1"}
          />
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  back: {
    padding: 4,
  },
  headerText: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
  },
  emptyBody: {
    textAlign: "center",
    color: colors.inkMuted,
    paddingHorizontal: spacing.lg,
  },
  link: {
    marginTop: spacing.sm,
    color: colors.rust,
    fontWeight: "600",
  },
});
