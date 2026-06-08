import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Avatar } from "@/components/Avatar";
import { Btn, Loader, Screen } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { endLiveStream } from "@/lib/api";
import {
  formatLiveChatTime,
  loadLiveChatMessages,
  sendLiveChatMessage,
} from "@/lib/live-chat";
import { getSupabase } from "@/lib/supabase";
import type { LiveChatMessage, LiveStream, Profile } from "@/lib/types";

export default function LiveRoomScreen() {
  const { room } = useLocalSearchParams<{ room: string }>();
  const { profile, session } = useAuth();
  const [stream, setStream] = useState<LiveStream | null>(null);
  const [host, setHost] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [chatError, setChatError] = useState<string | null>(null);
  const [streamLive, setStreamLive] = useState(true);
  const listRef = useRef<FlatList>(null);

  const isHost = stream?.host_id === profile?.id;
  const chatOpen = streamLive;

  const loadStream = useCallback(async () => {
    if (!room) return;
    const { data } = await getSupabase()
      .from("live_streams")
      .select("*")
      .eq("room_name", room)
      .maybeSingle();
    if (!data) {
      setLoading(false);
      return;
    }
    const s = data as LiveStream;
    setStream(s);
    setStreamLive(s.is_live);
    const { data: hostProfile } = await getSupabase()
      .from("profiles")
      .select("*")
      .eq("id", s.host_id)
      .maybeSingle();
    setHost((hostProfile as Profile) ?? null);
    const chat = await loadLiveChatMessages(getSupabase(), room);
    setMessages(chat);
    setLoading(false);
  }, [room]);

  useEffect(() => {
    loadStream();
  }, [loadStream]);

  useEffect(() => {
    if (!room) return;

    async function refreshLiveStatus() {
      const { data } = await getSupabase()
        .from("live_streams")
        .select("is_live")
        .eq("room_name", room)
        .maybeSingle();
      if (data) setStreamLive(data.is_live);
    }

    refreshLiveStatus();

    const statusChannel = getSupabase()
      .channel(`live-status:${room}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "live_streams",
          filter: `room_name=eq.${room}`,
        },
        (payload) => {
          const row = payload.new as { is_live?: boolean };
          if (typeof row.is_live === "boolean") setStreamLive(row.is_live);
        },
      )
      .subscribe();

    const channel = getSupabase()
      .channel(`live-chat:${room}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_chat_messages",
          filter: `room_name=eq.${room}`,
        },
        async (payload) => {
          const incoming = payload.new as LiveChatMessage;
          let author: Profile | undefined;
          if (incoming.user_id === profile?.id && profile) {
            author = profile;
          } else {
            const { data } = await getSupabase()
              .from("profiles")
              .select("*")
              .eq("id", incoming.user_id)
              .maybeSingle();
            author = (data as Profile | null) ?? undefined;
          }
          setMessages((prev) =>
            prev.some((m) => m.id === incoming.id)
              ? prev
              : [...prev, { ...incoming, author }],
          );
        },
      )
      .subscribe();
    return () => {
      getSupabase().removeChannel(statusChannel);
      getSupabase().removeChannel(channel);
    };
  }, [room, profile]);

  async function sendChat() {
    if (!draft.trim() || !room || !profile || !chatOpen) return;
    setChatError(null);
    const { message, error } = await sendLiveChatMessage(
      getSupabase(),
      room,
      profile.id,
      draft,
    );
    if (error) {
      setChatError(
        error.includes("row-level security")
          ? "Chat is only open while the stream is live."
          : error,
      );
      return;
    }
    if (message) {
      setMessages((prev) =>
        prev.some((m) => m.id === message.id) ? prev : [...prev, { ...message, author: profile }],
      );
      setDraft("");
    }
  }

  async function handleEnd() {
    if (!room || !session?.access_token) return;
    await endLiveStream(room, session.access_token);
    await loadStream();
  }

  if (loading || !profile) return <Loader />;
  if (!stream) {
    return (
      <Screen>
        <Text style={styles.missing}>Stream not found.</Text>
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.videoPlaceholder}>
        <Text style={styles.liveBadge}>{chatOpen ? "LIVE" : "ENDED"}</Text>
        <Text style={styles.streamTitle}>{stream.title}</Text>
        <Text style={styles.hostName}>{host?.display_name ?? "Host"}</Text>
        <Text style={styles.videoNote}>
          Native LiveKit video is coming soon. Use the web app to broadcast or watch video.
        </Text>
        {isHost && chatOpen && (
          <Btn label="End stream" onPress={handleEnd} />
        )}
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        style={styles.chatList}
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={() => listRef.current?.scrollToEnd()}
        renderItem={({ item }) => {
          const mine = item.user_id === profile.id;
          return (
            <View style={[styles.msg, mine && styles.msgMine]}>
              {!mine && (
                <Avatar
                  name={item.author?.display_name ?? "?"}
                  avatarUrl={item.author?.avatar_url}
                  size="sm"
                />
              )}
              <View style={styles.msgBody}>
                <Text style={styles.msgMeta}>
                  {item.author?.display_name ?? "Viewer"} · {formatLiveChatTime(item.created_at)}
                </Text>
                <Text style={mine ? styles.msgTextMine : styles.msgText}>{item.content}</Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.emptyChat}>Say hello in live chat!</Text>}
      />

      {chatOpen ? (
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Chat with everyone watching…"
            placeholderTextColor={colors.inkMuted}
            style={styles.input}
            maxLength={500}
          />
          <Pressable onPress={sendChat} style={styles.send}>
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.closed}>Chat closed — stream has ended</Text>
      )}
      {chatError ? <Text style={styles.chatError}>{chatError}</Text> : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  videoPlaceholder: {
    backgroundColor: colors.paper,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    padding: spacing.md,
    alignItems: "center",
  },
  liveBadge: {
    color: colors.rust,
    fontWeight: "800",
    marginBottom: 4,
  },
  streamTitle: { fontSize: 18, fontWeight: "700", color: colors.ink, textAlign: "center" },
  hostName: { color: colors.inkMuted, marginBottom: 8 },
  videoNote: { fontSize: 12, color: colors.inkMuted, textAlign: "center", marginBottom: 8 },
  chatList: { flex: 1 },
  chatContent: { padding: spacing.md },
  msg: { flexDirection: "row", gap: 8, marginBottom: 10 },
  msgMine: { flexDirection: "row-reverse" },
  msgBody: { maxWidth: "75%" },
  msgMeta: { fontSize: 10, color: colors.inkMuted, marginBottom: 2 },
  msgText: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
    borderRadius: 4,
    color: colors.ink,
  },
  msgTextMine: {
    backgroundColor: colors.rust,
    padding: 8,
    borderRadius: 4,
    color: colors.btnText,
  },
  emptyChat: { textAlign: "center", color: colors.inkMuted },
  composer: {
    flexDirection: "row",
    padding: spacing.sm,
    gap: 8,
    borderTopWidth: 2,
    borderTopColor: colors.border,
    backgroundColor: colors.paper,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.ink,
  },
  send: { justifyContent: "center", paddingHorizontal: 12 },
  sendText: { color: colors.rust, fontWeight: "700" },
  closed: { textAlign: "center", padding: spacing.md, color: colors.inkMuted },
  chatError: {
    textAlign: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    color: colors.rust,
    fontSize: 12,
  },
  missing: { textAlign: "center", color: colors.inkMuted, marginTop: 32 },
});
