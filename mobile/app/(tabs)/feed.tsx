import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { CreatePost } from "@/components/CreatePost";
import { PostCard } from "@/components/PostCard";
import { Loader, Screen, Subtitle, Title } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { loadFeed } from "@/lib/social";
import { getSupabase } from "@/lib/supabase";
import type { PostWithMeta } from "@/lib/types";

export default function FeedScreen() {
  const { profile } = useAuth();
  const [posts, setPosts] = useState<PostWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (!profile) return;
    const data = await loadFeed(getSupabase(), profile.id);
    setPosts(data);
    setLoading(false);
    setRefreshing(false);
  }, [profile]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!profile) return <Loader />;

  return (
    <Screen style={{ paddingBottom: 0 }}>
      <Title>Feed</Title>
      <Subtitle>Posts from people you follow</Subtitle>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); refresh(); }} />
        }
        ListHeaderComponent={<CreatePost user={profile} onPosted={refresh} />}
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
          <PostCard post={item} currentUser={profile} onUpdate={refresh} />
        )}
      />
    </Screen>
  );
}
