import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PostCard } from "@/components/PostCard";
import { Loader, Screen, Subtitle, Title } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { markPostViewed } from "@/lib/post-analytics";
import { loadPostById } from "@/lib/social";
import { getSupabase } from "@/lib/supabase";
import type { PostWithMeta } from "@/lib/types";

export default function PostDetailScreen() {
  const { id, comments, analytics } = useLocalSearchParams<{
    id: string;
    comments?: string;
    analytics?: string;
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

  useEffect(() => {
    if (!profile || !post || post.user_id === profile.id) return;
    void markPostViewed(getSupabase(), post.id, profile.id, post.user_id);
  }, [profile, post]);

  if (!profile) return <Loader />;

  const isOwn = post?.user_id === profile.id;

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <View style={styles.headerText}>
          <Title>{analytics === "1" && isOwn ? "Analytics" : "Post"}</Title>
          <Subtitle>
            {analytics === "1" && isOwn
              ? "How your post is doing"
              : "From your notifications"}
          </Subtitle>
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
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <PostCard
            post={post}
            currentUser={profile}
            onUpdate={refresh}
            initialShowComments={comments === "1"}
            initialShowAnalytics={(analytics === "1" || isOwn) && isOwn}
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
  back: { padding: 4 },
  headerText: { flex: 1 },
  content: { paddingBottom: spacing.xl },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.ink },
  emptyBody: {
    textAlign: "center",
    color: colors.inkMuted,
    paddingHorizontal: spacing.lg,
  },
});
