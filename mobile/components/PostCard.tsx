import { memo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "@/components/Avatar";
import { colors, spacing } from "@/constants/theme";
import {
  addComment,
  formatPostDate,
  loadComments,
  toggleLike,
} from "@/lib/social";
import { getSupabase } from "@/lib/supabase";
import type { Comment, PostWithMeta, Profile } from "@/lib/types";

export const PostCard = memo(function PostCard({
  post,
  currentUser,
}: {
  post: PostWithMeta;
  currentUser: Profile;
  onUpdate?: () => void;
}) {
  const [engagement, setEngagement] = useState(post.engagement);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");

  const author = post.author;
  const target = post.original_post ?? post;
  const rootId = post.reshare_of ?? post.id;

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
          <Text style={styles.meta}>@{author?.username} · {formatPostDate(post.created_at)}</Text>
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
      </View>

      {showComments && (
        <View style={styles.comments}>
          {comments.map((c) => (
            <Text key={c.id} style={styles.comment}>
              <Text style={styles.commentAuthor}>{c.author?.display_name ?? "User"}: </Text>
              {c.content}
            </Text>
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
  actions: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.md },
  action: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionText: { color: colors.inkMuted, fontSize: 13 },
  comments: { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
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
