import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "@/components/Avatar";
import { PostCard } from "@/components/PostCard";
import { Loader, Screen, Subtitle, Title } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { loadPostAnalytics, markPostViewed } from "@/lib/post-analytics";
import { loadPostById } from "@/lib/social";
import { getSupabase } from "@/lib/supabase";
import type { PostAnalytics, PostWithMeta } from "@/lib/types";

function formatViewedAt(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

function AnalyticsBlock({ data }: { data: PostAnalytics }) {
  const maxDay = useMemo(
    () => Math.max(1, ...data.viewsByDay.map((d) => d.views)),
    [data.viewsByDay],
  );

  if (data.schemaMissing) {
    return (
      <View style={styles.card}>
        <Text style={styles.muted}>
          Post views are not set up yet. Run post-analytics-schema.sql in Supabase.
        </Text>
      </View>
    );
  }

  const stats = [
    { label: "Views", value: data.views },
    { label: "Likes", value: data.likes },
    { label: "Comments", value: data.comments },
    { label: "Reshares", value: data.reshares },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="stats-chart" size={16} color={colors.rust} />
        <Text style={styles.cardTitle}>Post analytics</Text>
      </View>
      <Text style={styles.privateNote}>Only you can see this</Text>

      <View style={styles.statsGrid}>
        {stats.map((s) => (
          <View key={s.label} style={styles.statCell}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.rateRow}>
        <Text style={styles.rateLabel}>Engagement rate</Text>
        <Text style={styles.rateValue}>
          {data.views === 0 ? "—" : `${data.engagementRate}%`}
        </Text>
      </View>

      <Text style={styles.sectionLabel}>Views · last 7 days</Text>
      <View style={styles.chart}>
        {data.viewsByDay.map((day) => (
          <View key={day.date} style={styles.barCol}>
            <View
              style={[
                styles.bar,
                {
                  height: Math.max(4, (day.views / maxDay) * 72),
                  opacity: day.views > 0 ? 1 : 0.25,
                },
              ]}
            />
            <Text style={styles.barLabel}>
              {new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, {
                weekday: "narrow",
              })}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Recent viewers</Text>
      {data.recentViewers.length === 0 ? (
        <Text style={styles.muted}>No views yet.</Text>
      ) : (
        data.recentViewers.map((v) => {
          const name = v.profile?.display_name ?? "Viewer";
          return (
            <Pressable
              key={`${v.viewerId}-${v.viewedAt}`}
              style={styles.viewerRow}
              onPress={() =>
                v.profile?.username &&
                router.push(`/profile/${v.profile.username}`)
              }
            >
              <Avatar name={name} avatarUrl={v.profile?.avatar_url} size="sm" />
              <View style={styles.viewerText}>
                <Text style={styles.viewerName}>{name}</Text>
                <Text style={styles.viewerTime}>{formatViewedAt(v.viewedAt)}</Text>
              </View>
            </Pressable>
          );
        })
      )}
    </View>
  );
}

export default function PostDetailScreen() {
  const { id, comments, analytics } = useLocalSearchParams<{
    id: string;
    comments?: string;
    analytics?: string;
  }>();
  const { profile } = useAuth();
  const [post, setPost] = useState<PostWithMeta | null>(null);
  const [insights, setInsights] = useState<PostAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  const refresh = useCallback(async () => {
    if (!profile || !id) return;
    setLoading(true);
    const data = await loadPostById(getSupabase(), id, profile.id);
    setPost(data);
    setMissing(!data);
    if (data && data.user_id === profile.id) {
      const a = await loadPostAnalytics(getSupabase(), data.id, profile.id);
      setInsights(a);
    } else {
      setInsights(null);
    }
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
  const showAnalytics = analytics === "1" || isOwn;

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <View style={styles.headerText}>
          <Title>{showAnalytics && isOwn ? "Analytics" : "Post"}</Title>
          <Subtitle>
            {showAnalytics && isOwn ? "How your post is doing" : "From your notifications"}
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
          {isOwn && insights ? <AnalyticsBlock data={insights} /> : null}
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
  back: { padding: 4 },
  headerText: { flex: 1 },
  content: { paddingBottom: spacing.xl, gap: spacing.md },
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
  card: {
    backgroundColor: colors.paper,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.md,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontWeight: "700", color: colors.ink, fontSize: 14 },
  privateNote: {
    marginTop: 4,
    marginBottom: spacing.sm,
    fontSize: 10,
    color: colors.inkMuted,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  statsGrid: { flexDirection: "row", flexWrap: "wrap" },
  statCell: {
    width: "50%",
    paddingVertical: 10,
    alignItems: "center",
  },
  statValue: { fontSize: 22, fontWeight: "800", color: colors.ink },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.inkMuted,
    textTransform: "uppercase",
  },
  rateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 12,
    marginTop: 4,
  },
  rateLabel: { fontWeight: "600", color: colors.ink },
  rateValue: { fontSize: 18, fontWeight: "800", color: colors.ink },
  sectionLabel: {
    marginTop: 12,
    marginBottom: 8,
    fontSize: 10,
    fontWeight: "700",
    color: colors.inkMuted,
    textTransform: "uppercase",
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 90,
    gap: 6,
  },
  barCol: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  bar: {
    width: "100%",
    backgroundColor: colors.rust,
    borderRadius: 2,
    minHeight: 4,
  },
  barLabel: { marginTop: 4, fontSize: 9, color: colors.inkMuted },
  viewerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  viewerText: { flex: 1 },
  viewerName: { fontWeight: "600", color: colors.ink },
  viewerTime: { fontSize: 11, color: colors.inkMuted },
  muted: { color: colors.inkMuted, fontSize: 13 },
});
