import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, Text } from "react-native";
import { CreatePost } from "@/components/CreatePost";
import { PostCard } from "@/components/PostCard";
import { Loader, Screen, Subtitle, Title } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { loadFeed } from "@/lib/social";
import { getSupabase } from "@/lib/supabase";
import type { PostWithMeta, Profile } from "@/lib/types";

export default function FeedScreen() {
  const { session, profile, profileLoading } = useAuth();
  const [posts, setPosts] = useState<PostWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const userId = profile?.id ?? session?.user?.id;

  const refresh = useCallback(async () => {
    if (!userId) return;
    const data = await loadFeed(getSupabase(), userId);
    setPosts(data);
    setLoading(false);
    setRefreshing(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    refresh();
  }, [refresh, userId]);

  if (!userId) return <Loader />;

  const viewer =
    profile ??
    ({ id: userId, username: "", display_name: "", avatar_url: null } as Profile);

  return (
    <Screen style={{ paddingBottom: 0 }}>
      <Title>Feed</Title>
      <Subtitle>Posts from people you follow</Subtitle>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        removeClippedSubviews
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={7}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); refresh(); }} />
        }
        ListHeaderComponent={
          profile ? (
            <CreatePost user={profile} onPosted={refresh} />
          ) : profileLoading ? (
            <Loader />
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <Loader />
          ) : (
            <Text style={{ textAlign: "center", color: "#6b5344", marginTop: 24 }}>
              No posts yet. Follow people or post something!
            </Text>
          )
        }
        renderItem={({ item }) => (
          <PostCard post={item} currentUser={viewer} onUpdate={refresh} />
        )}
      />
    </Screen>
  );
}
