import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "@/components/Avatar";
import { Loader, Screen, Subtitle, Title } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import {
  formatNotificationTime,
  getNotificationHref,
  getNotificationText,
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";
import { navigateFromNotificationHref } from "@/lib/notification-navigation";
import { getSupabase } from "@/lib/supabase";
import type { Notification, NotificationType } from "@/lib/types";

const icons: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  follow: "person-add",
  like: "heart",
  comment: "chatbubble",
  reshare: "repeat",
  new_post: "document-text",
  new_status: "ellipse",
  message: "mail",
  live_started: "radio",
  live_ended: "radio-outline",
  gift: "gift",
};

export default function NotificationsScreen() {
  const { profile } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!profile) return;
    const { notifications, error: loadError } = await loadNotifications(
      getSupabase(),
      profile.id,
    );
    setItems(notifications);
    if (loadError) setError(loadError);
    setLoading(false);
    setRefreshing(false);
  }, [profile]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!profile) return;
    const channel = getSupabase()
      .channel(`notifications:${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${profile.id}`,
        },
        (payload) => {
          setItems((prev) => [payload.new as Notification, ...prev]);
        },
      )
      .subscribe();
    return () => {
      getSupabase().removeChannel(channel);
    };
  }, [profile]);

  async function openItem(item: Notification) {
    if (!profile) return;
    if (!item.read_at) {
      await markNotificationRead(getSupabase(), item.id, profile.id);
      setItems((prev) =>
        prev.map((n) =>
          n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n,
        ),
      );
    }
    const href = getNotificationHref(item, item.actor?.username);
    navigateFromNotificationHref(href);
  }

  if (!profile) return <Loader />;

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Title>Notifications</Title>
          <Subtitle>Likes, follows, live streams, and more</Subtitle>
        </View>
        {items.some((n) => !n.read_at) && (
          <Pressable
            onPress={async () => {
              await markAllNotificationsRead(getSupabase(), profile.id);
              refresh();
            }}
          >
            <Text style={styles.markAll}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); refresh(); }} />
        }
        ListEmptyComponent={
          loading ? <Loader /> : (
            <Text style={styles.empty}>No notifications yet.</Text>
          )
        }
        renderItem={({ item }) => (
          <View style={[styles.item, !item.read_at && styles.unread]}>
            {item.actor?.username ? (
              <Pressable
                onPress={async () => {
                  if (!profile) return;
                  if (!item.read_at) {
                    await markNotificationRead(getSupabase(), item.id, profile.id);
                    setItems((prev) =>
                      prev.map((n) =>
                        n.id === item.id
                          ? { ...n, read_at: new Date().toISOString() }
                          : n,
                      ),
                    );
                  }
                  router.push(`/profile/${item.actor!.username}`);
                }}
              >
                <Avatar name={item.actor.display_name} avatarUrl={item.actor.avatar_url} />
              </Pressable>
            ) : item.actor ? (
              <Avatar name={item.actor.display_name} avatarUrl={item.actor.avatar_url} />
            ) : (
              <View style={styles.iconWrap}>
                <Ionicons name={icons[item.type]} size={20} color={colors.rust} />
              </View>
            )}
            <Pressable style={styles.itemText} onPress={() => openItem(item)}>
              <Text style={styles.itemBody}>{getNotificationText(item)}</Text>
              <Text style={styles.time}>{formatNotificationTime(item.created_at)}</Text>
            </Pressable>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  markAll: { color: colors.rust, fontWeight: "600", fontSize: 12 },
  error: { color: colors.rust, marginBottom: spacing.sm },
  item: { flexDirection: "row", gap: spacing.sm, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  unread: { backgroundColor: "rgba(184, 92, 56, 0.08)" },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  itemText: { flex: 1 },
  itemBody: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  time: { fontSize: 11, color: colors.inkMuted, marginTop: 4 },
  empty: { textAlign: "center", color: colors.inkMuted, marginTop: 32 },
});
