import { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { PostCard } from "@/components/PostCard";
import { Avatar } from "@/components/Avatar";
import { Btn, Loader, Screen } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import {
  getFollowCounts,
  isFollowing,
  loadUserPosts,
  toggleFollow,
} from "@/lib/social";
import { getSupabase } from "@/lib/supabase";
import type { FollowCounts, PostWithMeta, Profile } from "@/lib/types";

export default function ProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { profile: currentUser } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<PostWithMeta[]>([]);
  const [counts, setCounts] = useState<FollowCounts>({ followers: 0, following: 0 });
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!username || !currentUser) return;
    const { data } = await getSupabase()
      .from("profiles")
      .select("*")
      .eq("username", username)
      .maybeSingle();
    if (!data) {
      setLoading(false);
      return;
    }
    const p = data as Profile;
    setProfile(p);
    setPosts(await loadUserPosts(getSupabase(), p.id, currentUser.id));
    setCounts(await getFollowCounts(getSupabase(), p.id));
    setFollowing(await isFollowing(getSupabase(), currentUser.id, p.id));
    setLoading(false);
  }, [username, currentUser]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleFollow() {
    if (!profile || !currentUser) return;
    const now = await toggleFollow(getSupabase(), currentUser.id, profile.id);
    setFollowing(now);
    setCounts(await getFollowCounts(getSupabase(), profile.id));
  }

  if (loading || !currentUser) return <Loader />;
  if (!profile) {
    return (
      <Screen>
        <Text style={styles.missing}>Profile not found.</Text>
      </Screen>
    );
  }

  const isOwn = profile.id === currentUser.id;

  return (
    <Screen>
      <View style={styles.header}>
        <Avatar name={profile.display_name} avatarUrl={profile.avatar_url} size="xl" />
        <Text style={styles.name}>{profile.display_name}</Text>
        <Text style={styles.username}>@{profile.username}</Text>
        <Text style={styles.country}>{profile.country}</Text>
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
        <View style={styles.counts}>
          <Text style={styles.count}><Text style={styles.countNum}>{counts.followers}</Text> followers</Text>
          <Text style={styles.count}><Text style={styles.countNum}>{counts.following}</Text> following</Text>
        </View>
        {!isOwn && (
          <Btn
            label={following ? "Following" : "Connect"}
            onPress={handleFollow}
            variant={following ? "outline" : "primary"}
          />
        )}
      </View>
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <PostCard post={item} currentUser={currentUser} onUpdate={refresh} />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No posts yet.</Text>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", marginBottom: spacing.lg },
  name: { fontSize: 22, fontWeight: "700", color: colors.ink, marginTop: spacing.sm },
  username: { color: colors.rust, fontWeight: "600" },
  country: { color: colors.inkMuted },
  bio: { textAlign: "center", color: colors.ink, marginTop: spacing.sm },
  counts: { flexDirection: "row", gap: spacing.lg, marginVertical: spacing.md },
  count: { color: colors.inkMuted, fontSize: 13 },
  countNum: { fontWeight: "700", color: colors.ink },
  empty: { textAlign: "center", color: colors.inkMuted },
  missing: { color: colors.inkMuted, textAlign: "center", marginTop: 32 },
});
