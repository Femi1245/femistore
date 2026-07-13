import { memo, useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "@/components/Avatar";
import { colors, spacing } from "@/constants/theme";
import { loadPostAnalytics } from "@/lib/post-analytics";
import {
  addComment,
  formatPostDate,
  loadComments,
  toggleLike,
} from "@/lib/social";
import { getSupabase } from "@/lib/supabase";
import type { Comment, PostAnalytics, PostWithMeta, Profile } from "@/lib/types";

function InlineAnalytics({
  postId,
  ownerId,
}: {
  postId: string;
  ownerId: string;
}) {
  const [data, setData] = useState<PostAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void loadPostAnalytics(getSupabase(), postId, ownerId).then((a) => {
      if (!cancelled) {
        setData(a);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [postId, ownerId]);

  const maxDay = useMemo(
    () => Math.max(1, ...(data?.viewsByDay.map((d) => d.views) ?? [1])),
    [data],
  );

  if (loading) {
    return <Text style={styles.analyticsMuted}>Loading analytics…</Text>;
  }
  if (!data) {
    return <Text style={styles.analyticsMuted}>No analytics available.</Text>;
  }

  const stats = [
    ["Views", data.views],
    ["Likes", data.likes],
    ["Comments", data.comments],
    ["Reshares", data.reshares],
  ] as const;

  return (
    <View style={styles.analyticsBox}>
      <Text style={styles.analyticsTitle}>Your analytics · only you</Text>
      <View style={styles.statsGrid}>
        {stats.map(([label, value]) => (
          <View key={label} style={styles.statCell}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.rateRow}>
        <Text style={styles.rateLabel}>Engagement rate</Text>
        <Text style={styles.rateValue}>
          {data.views === 0 ? "—" : `${data.engagementRate}%`}
        </Text>
      </View>
      <View style={styles.chart}>
        {data.viewsByDay.map((day) => (
          <View key={day.date} style={styles.barCol}>
            <View
              style={[
                styles.bar,
                {
                  height: Math.max(4, (day.views / maxDay) * 56),
                  opacity: day.views > 0 ? 1 : 0.25,
                },
              ]}
            />
          </View>
        ))}
      </View>
      {data.recentViewers.slice(0, 4).map((v) => (
        <Text key={`${v.viewerId}-${v.viewedAt}`} style={styles.viewerLine}>
          {v.profile?.display_name ?? "Viewer"}
        </Text>
      ))}
      {data.recentViewers.length === 0 ? (
        <Text style={styles.analyticsMuted}>No views yet.</Text>
      ) : null}
    </View>
  );
}

export const PostCard = memo(function PostCard({
  post,
  currentUser,
  initialShowComments = false,
  initialShowAnalytics = false,
}: {
  post: PostWithMeta;
  currentUser: Profile;
  onUpdate?: () => void;
  initialShowComments?: boolean;
  initialShowAnalytics?: boolean;
}) {
  const [engagement, setEngagement] = useState(post.engagement);
  const [showComments, setShowComments] = useState(initialShowComments);
  const [showAnalytics, setShowAnalytics] = useState(initialShowAnalytics);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");

  const author = post.author;
  const target = post.original_post ?? post;
  const rootId = post.reshare_of ?? post.id;
  const canShowAnalytics = post.user_id === currentUser.id && !post.reshare_of;

  useEffect(() => {
    if (!initialShowComments) return;
    void loadComments(getSupabase(), rootId).then(setComments);
  }, [initialShowComments, rootId]);

  async function handleLike() {
    const supabase = getSupabase();
    await toggleLike(supabase, rootId, currentUser.id, engagement.liked_by_me);
    setEngagement((prev) => ({
      ...prev,
      liked_by_me: !prev.liked_by_me,
      likes: prev.liked_by_me ? prev.likes - 1 : prev.likes + 1,
    }));
  }

  async function openComments() {
    setShowComments(true);
    const list = await loadComments(getSupabase(), rootId);
    setComments(list);
  }

  async function submitComment() {
    if (!draft.trim()) return;
    await addComment(getSupabase(), rootId, currentUser.id, draft.trim());
    setDraft("");
    setEngagement((prev) => ({ ...prev, comments: prev.comments + 1 }));
    const list = await loadComments(getSupabase(), rootId);
    setComments(list);
  }

  return (
    <View style={styles.card}>
      <Pressable
        style={styles.header}
        onPress={() => author && router.push(`/profile/${author.username}`)}
      >
        <Avatar name={author?.display_name ?? "?"} avatarUrl={author?.avatar_url} />
        <View style={styles.headerText}>
          <Text style={styles.name}>{author?.display_name ?? "Unknown"}</Text>
          <Text style={styles.meta}>
            @{author?.username} · {formatPostDate(post.created_at)}
          </Text>
        </View>
      </Pressable>

      {post.reshare_of && post.content ? (
        <Text style={styles.caption}>{post.content}</Text>
      ) : null}
      {target.content ? <Text style={styles.body}>{target.content}</Text> : null}
      {target.media_url && target.media_type === "image" ? (
        // eslint-disable-next-line jsx-a11y/alt-text -- React Native Image uses accessibilityLabel
        <Image
          source={{ uri: target.media_url }}
          style={styles.media}
          resizeMode="cover"
          accessibilityLabel="Post image"
        />
      ) : null}

      <View style={styles.actions}>
        <Pressable style={styles.action} onPress={handleLike}>
          <Ionicons
            name={engagement.liked_by_me ? "heart" : "heart-outline"}
            size={20}
            color={engagement.liked_by_me ? colors.rust : colors.inkMuted}
          />
          <Text style={styles.actionText}>{engagement.likes}</Text>
        </Pressable>
        <Pressable style={styles.action} onPress={openComments}>
          <Ionicons name="chatbubble-outline" size={20} color={colors.inkMuted} />
          <Text style={styles.actionText}>{engagement.comments}</Text>
        </Pressable>
        {canShowAnalytics ? (
          <Pressable
            style={[styles.action, showAnalytics && styles.actionActive]}
            onPress={() => setShowAnalytics((v) => !v)}
          >
            <Ionicons
              name="stats-chart-outline"
              size={20}
              color={showAnalytics ? colors.rust : colors.inkMuted}
            />
            <Text
              style={[
                styles.actionText,
                showAnalytics && { color: colors.rust, fontWeight: "700" },
              ]}
            >
              Analytics
            </Text>
          </Pressable>
        ) : null}
      </View>

      {canShowAnalytics && showAnalytics ? (
        <InlineAnalytics postId={post.id} ownerId={currentUser.id} />
      ) : null}

      {showComments && (
        <View style={styles.comments}>
          {comments.map((c) => (
            <Pressable
              key={c.id}
              onPress={() =>
                c.author?.username && router.push(`/profile/${c.author.username}`)
              }
            >
              <Text style={styles.comment}>
                <Text style={styles.commentAuthor}>
                  {c.author?.display_name ?? "User"}:{" "}
                </Text>
                {c.content}
              </Text>
            </Pressable>
          ))}
          <View style={styles.commentRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Write a comment…"
              placeholderTextColor={colors.inkMuted}
              style={styles.commentInput}
            />
            <Pressable onPress={submitComment}>
              <Ionicons name="send" size={20} color={colors.rust} />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.paper,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  header: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  headerText: { flex: 1 },
  name: { fontWeight: "700", color: colors.ink },
  meta: { fontSize: 12, color: colors.inkMuted },
  caption: { fontSize: 13, color: colors.inkMuted, marginBottom: 4 },
  body: { fontSize: 15, lineHeight: 22, color: colors.ink },
  media: { width: "100%", height: 220, borderRadius: 8, marginTop: spacing.sm },
  actions: {
    flexDirection: "row",
    gap: spacing.lg,
    marginTop: spacing.md,
    flexWrap: "wrap",
  },
  action: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionActive: {
    backgroundColor: "rgba(184, 92, 56, 0.12)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionText: { color: colors.inkMuted, fontSize: 13 },
  analyticsBox: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  analyticsTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.inkMuted,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  analyticsMuted: { color: colors.inkMuted, fontSize: 13, marginTop: 8 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap" },
  statCell: { width: "50%", paddingVertical: 8, alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "800", color: colors.ink },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.inkMuted,
    textTransform: "uppercase",
  },
  rateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rateLabel: { fontWeight: "600", color: colors.ink },
  rateValue: { fontWeight: "800", color: colors.ink },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 64,
    gap: 4,
    marginTop: 8,
  },
  barCol: { flex: 1, justifyContent: "flex-end" },
  bar: { width: "100%", backgroundColor: colors.rust, borderRadius: 2 },
  viewerLine: { fontSize: 13, color: colors.ink, marginTop: 4 },
  comments: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  comment: { fontSize: 13, marginBottom: 6, color: colors.ink },
  commentAuthor: { fontWeight: "600" },
  commentRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    color: colors.ink,
  },
});
