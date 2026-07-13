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
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "@/components/Avatar";
import { Loader } from "@/components/ui";
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
      <View style={styles.flex}>
        <Text style={styles.missing}>Stream not found.</Text>
      </View>
    );
  }

  const overlayMessages = messages.slice(-40);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.stage}>
        <View style={styles.topBar}>
          <Pressable style={styles.iconBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>
          <View style={styles.topMeta}>
            <View style={styles.badgeRow}>
              <View style={styles.liveBadge}>
                <Text style={styles.liveBadgeText}>{chatOpen ? "LIVE" : "ENDED"}</Text>
              </View>
            </View>
            <Text style={styles.streamTitle} numberOfLines={1}>
              {stream.title}
            </Text>
            <Text style={styles.hostName} numberOfLines={1}>
              {host?.display_name ?? "Host"}
            </Text>
          </View>
          {isHost && chatOpen && (
            <Pressable style={styles.endBtn} onPress={handleEnd}>
              <Text style={styles.endBtnText}>End</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.videoNoteWrap}>
          <Text style={styles.videoNote}>
            Full-screen live video uses the web app for now. Chat below works the same as TikTok Live.
          </Text>
        </View>

        <View style={styles.chatOverlay}>
          <FlatList
            ref={listRef}
            data={overlayMessages}
            keyExtractor={(m) => m.id}
            style={styles.chatList}
            contentContainerStyle={styles.chatContent}
            onContentSizeChange={() => listRef.current?.scrollToEnd()}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isHostMsg = item.user_id === stream.host_id;
              const name = item.author?.display_name ?? "Viewer";
              return (
                <View style={styles.msg}>
                  <Avatar name={name} avatarUrl={item.author?.avatar_url} size="sm" />
                  <View style={styles.msgBubble}>
                    <View style={styles.msgMetaRow}>
                      <Text style={styles.msgName}>{name}</Text>
                      {isHostMsg ? (
                        <Text style={styles.hostTag}>HOST</Text>
                      ) : null}
                      <Text style={styles.msgTime}>{formatLiveChatTime(item.created_at)}</Text>
                    </View>
                    <Text style={styles.msgText}>{item.content}</Text>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.emptyChat}>Say hello in live chat!</Text>
            }
          />

          {chatOpen ? (
            <View style={styles.composer}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Say something…"
                placeholderTextColor="rgba(255,255,255,0.55)"
                style={styles.input}
                maxLength={500}
              />
              <Pressable onPress={sendChat} style={styles.send}>
                <Ionicons name="send" size={18} color="#fff" />
              </Pressable>
            </View>
          ) : (
            <Text style={styles.closed}>Chat closed — stream has ended</Text>
          )}
          {chatError ? <Text style={styles.chatError}>{chatError}</Text> : null}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#000" },
  stage: { flex: 1, backgroundColor: "#0a0a0a" },
  topBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingTop: Platform.OS === "ios" ? 54 : 16,
    paddingHorizontal: spacing.md,
    paddingBottom: 12,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  topMeta: { flex: 1, minWidth: 0 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  liveBadge: {
    backgroundColor: "#dc2626",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  liveBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  streamTitle: { marginTop: 4, fontSize: 16, fontWeight: "700", color: "#fff" },
  hostName: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2 },
  endBtn: {
    backgroundColor: "#dc2626",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  endBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  videoNoteWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  videoNote: {
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    lineHeight: 20,
  },
  chatOverlay: {
    justifyContent: "flex-end",
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
    backgroundColor: "transparent",
  },
  chatList: { maxHeight: 260 },
  chatContent: { paddingHorizontal: spacing.md, paddingBottom: 8, gap: 8 },
  msg: { flexDirection: "row", gap: 8, marginBottom: 8, maxWidth: "88%" },
  msgBubble: {
    flexShrink: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  msgMetaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  msgName: { color: "#fff", fontWeight: "700", fontSize: 11 },
  hostTag: {
    color: "#fff",
    backgroundColor: "#dc2626",
    fontSize: 8,
    fontWeight: "800",
    paddingHorizontal: 4,
    paddingVertical: 1,
    overflow: "hidden",
    borderRadius: 3,
  },
  msgTime: { color: "rgba(255,255,255,0.5)", fontSize: 10 },
  msgText: { color: "rgba(255,255,255,0.95)", fontSize: 14, lineHeight: 18, marginTop: 2 },
  emptyChat: { color: "rgba(255,255,255,0.55)", textAlign: "left", paddingVertical: 8 },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingTop: 4,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: "#fff",
  },
  send: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
  },
  closed: {
    textAlign: "center",
    padding: spacing.md,
    color: "rgba(255,255,255,0.6)",
  },
  chatError: {
    textAlign: "center",
    paddingHorizontal: spacing.md,
    paddingTop: 4,
    color: "#fca5a5",
    fontSize: 12,
  },
  missing: { textAlign: "center", color: "rgba(255,255,255,0.6)", marginTop: 32 },
});
