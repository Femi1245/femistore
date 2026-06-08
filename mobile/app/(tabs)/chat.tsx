import { useCallback, useEffect, useState } from "react";
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
import { Avatar } from "@/components/Avatar";
import { Loader, Screen, Subtitle, Title } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import {
  findOrCreateConversation,
  formatMessageTime,
  loadConversations,
} from "@/lib/chat";
import { getSupabase } from "@/lib/supabase";
import type { ConversationPreview, Message, Profile } from "@/lib/types";

export default function ChatScreen() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<"chats" | "discover">("chats");
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [discoverUsers, setDiscoverUsers] = useState<Profile[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeOther, setActiveOther] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);

  const refreshConversations = useCallback(async () => {
    if (!profile) return;
    const list = await loadConversations(getSupabase(), profile.id);
    setConversations(list);
  }, [profile]);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  useEffect(() => {
    if (!profile || tab !== "discover") return;
    async function load() {
      if (!profile) return;
      let query = getSupabase()
        .from("profiles")
        .select("*")
        .neq("id", profile.id)
        .order("created_at", { ascending: false })
        .limit(40);
      if (search.trim()) {
        query = query.or(
          `display_name.ilike.%${search}%,username.ilike.%${search}%`,
        );
      }
      const { data } = await query;
      setDiscoverUsers((data as Profile[]) ?? []);
    }
    load();
  }, [tab, search, profile]);

  useEffect(() => {
    if (!activeConvId) return;
    async function load() {
      const { data } = await getSupabase()
        .from("messages")
        .select("*")
        .eq("conversation_id", activeConvId)
        .order("created_at", { ascending: true });
      setMessages((data as Message[]) ?? []);
    }
    load();

    const channel = getSupabase()
      .channel(`messages:${activeConvId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConvId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) =>
            prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
          );
          refreshConversations();
        },
      )
      .subscribe();

    return () => {
      getSupabase().removeChannel(channel);
    };
  }, [activeConvId, refreshConversations]);

  async function openChat(other: Profile, convId?: string) {
    if (!profile) return;
    setChatError(null);

    if (!convId) {
      const { convId: createdId, error } = await findOrCreateConversation(
        getSupabase(),
        profile.id,
        other.id,
      );
      if (error) {
        setChatError(error);
        return;
      }
      if (!createdId) return;
      convId = createdId;
    }

    setActiveConvId(convId);
    setActiveOther(other);
    setTab("chats");
  }

  async function sendMessage() {
    if (!draft.trim() || !activeConvId || !profile) return;
    setChatError(null);
    const content = draft.trim();
    setDraft("");

    const { error } = await getSupabase().from("messages").insert({
      conversation_id: activeConvId,
      sender_id: profile.id,
      content,
    });

    if (error) {
      setChatError(
        error.message.includes("row-level security")
          ? "You can only message friends. Both of you must connect (follow each other)."
          : error.message,
      );
      setDraft(content);
      return;
    }

    refreshConversations();
  }

  if (!profile) return <Loader />;

  if (activeConvId && activeOther) {
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.chatHeader}>
          <Pressable onPress={() => { setActiveConvId(null); setActiveOther(null); }}>
            <Text style={styles.back}>← Back</Text>
          </Pressable>
          <Text style={styles.chatTitle}>{activeOther.display_name}</Text>
        </View>
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.messages}
          renderItem={({ item }) => {
            const mine = item.sender_id === profile.id;
            return (
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                <Text style={mine ? styles.bubbleTextMine : styles.bubbleText}>
                  {item.content}
                </Text>
                <Text style={styles.time}>{formatMessageTime(item.created_at)}</Text>
              </View>
            );
          }}
        />
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Message…"
            placeholderTextColor={colors.inkMuted}
            style={styles.input}
          />
          <Pressable onPress={sendMessage} style={styles.send}>
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <Screen>
      <Title>Chat</Title>
      <Subtitle>Messages and discover people</Subtitle>
      {chatError ? <Text style={styles.error}>{chatError}</Text> : null}
      <View style={styles.tabs}>
        <Pressable onPress={() => setTab("chats")} style={[styles.tab, tab === "chats" && styles.tabActive]}>
          <Text style={tab === "chats" ? styles.tabTextActive : styles.tabText}>Chats</Text>
        </Pressable>
        <Pressable onPress={() => setTab("discover")} style={[styles.tab, tab === "discover" && styles.tabActive]}>
          <Text style={tab === "discover" ? styles.tabTextActive : styles.tabText}>Discover</Text>
        </Pressable>
      </View>

      {tab === "discover" && (
        <>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search people…"
            placeholderTextColor={colors.inkMuted}
            style={styles.search}
          />
          <Text style={styles.hint}>Message after you both connect (follow each other).</Text>
        </>
      )}

      {tab === "chats" ? (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => openChat(item.other_user, item.id)}>
              <Avatar name={item.other_user.display_name} avatarUrl={item.other_user.avatar_url} />
              <View style={styles.rowText}>
                <Text style={styles.name}>{item.other_user.display_name}</Text>
                <Text style={styles.preview} numberOfLines={1}>
                  {item.last_message ?? "Start chatting"}
                </Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>No conversations yet. Discover people to chat!</Text>
          }
        />
      ) : (
        <FlatList
          data={discoverUsers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => openChat(item)}>
              <Avatar name={item.display_name} avatarUrl={item.avatar_url} />
              <View style={styles.rowText}>
                <Text style={styles.name}>{item.display_name}</Text>
                <Text style={styles.preview}>@{item.username} · {item.country}</Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No users found.</Text>}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.paper,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  back: { color: colors.rust, fontWeight: "600" },
  chatTitle: { fontSize: 18, fontWeight: "700", color: colors.ink },
  messages: { padding: spacing.md, flexGrow: 1 },
  bubble: { maxWidth: "80%", marginBottom: 8, padding: 10, borderRadius: 8 },
  bubbleMine: { alignSelf: "flex-end", backgroundColor: colors.rust },
  bubbleTheirs: { alignSelf: "flex-start", backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border },
  bubbleText: { color: colors.ink },
  bubbleTextMine: { color: colors.btnText },
  time: { fontSize: 10, marginTop: 4, opacity: 0.7, color: colors.inkMuted },
  composer: { flexDirection: "row", padding: spacing.sm, gap: 8, borderTopWidth: 2, borderTopColor: colors.border, backgroundColor: colors.paper },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 8, color: colors.ink },
  send: { justifyContent: "center", paddingHorizontal: 12 },
  sendText: { color: colors.rust, fontWeight: "700" },
  tabs: { flexDirection: "row", marginBottom: spacing.sm, gap: 8 },
  tab: { flex: 1, paddingVertical: 8, alignItems: "center", borderWidth: 2, borderColor: colors.border, borderRadius: 4 },
  tabActive: { backgroundColor: colors.rust, borderColor: colors.rustDark },
  tabText: { color: colors.inkMuted, fontWeight: "600" },
  tabTextActive: { color: colors.btnText, fontWeight: "600" },
  search: { borderWidth: 2, borderColor: colors.border, borderRadius: 4, padding: 10, marginBottom: spacing.sm, color: colors.ink, backgroundColor: colors.white },
  row: { flexDirection: "row", gap: spacing.sm, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowText: { flex: 1 },
  name: { fontWeight: "700", color: colors.ink },
  preview: { fontSize: 13, color: colors.inkMuted },
  empty: { textAlign: "center", color: colors.inkMuted, marginTop: 24 },
  error: { color: colors.rust, fontSize: 13, marginBottom: spacing.sm },
  hint: { fontSize: 12, color: colors.inkMuted, marginBottom: spacing.sm },
});
