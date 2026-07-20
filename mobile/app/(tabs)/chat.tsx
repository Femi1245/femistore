import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Audio } from "expo-av";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { Avatar } from "@/components/Avatar";
import { Btn, Loader, Screen, Subtitle, Title } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import {
  conversationLabel,
  filterConversationPreviews,
  findOrCreateConversation,
  formatMessageTime,
  joinChannel,
  loadActiveChat,
  loadAllConversations,
  loadMutualFriends,
  loadPublicChannels,
  secretMessageExpiry,
} from "@/lib/chat";
import { findUserByPhone } from "@/lib/phone";
import { startCall } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
import { sendVoiceMessageFromUri } from "@/lib/voicemail";
import { markConversationRead } from "@/lib/chat-read";
import {
  isMessageReadByOther,
  loadConversationReadCursors,
  otherMemberReadAt as pickOtherMemberReadAt,
} from "@/lib/read-receipts";
import type { ActiveChat, ConversationPreview, Message, Profile } from "@/lib/types";

type Tab = "chats" | "secret" | "discover" | "phone" | "channels";

export default function ChatScreen() {
  const { profile } = useAuth();
  const { c: deepLinkConvId } = useLocalSearchParams<{ c?: string }>();
  const [tab, setTab] = useState<Tab>("chats");
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [secretChats, setSecretChats] = useState<ConversationPreview[]>([]);
  const [secretFriends, setSecretFriends] = useState<Profile[]>([]);
  const [discoverUsers, setDiscoverUsers] = useState<Profile[]>([]);
  const [publicChannels, setPublicChannels] = useState<ConversationPreview[]>([]);
  const [activeChat, setActiveChat] = useState<ActiveChat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [phoneSearch, setPhoneSearch] = useState("");
  const [phoneResult, setPhoneResult] = useState<Profile | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [otherMemberReadAt, setOtherMemberReadAt] = useState<string | null>(null);

  const refreshConversations = useCallback(async () => {
    if (!profile) return;
    const supabase = getSupabase();
    const all = await loadAllConversations(supabase, profile.id);
    setConversations(filterConversationPreviews(all, "regular"));
    setSecretChats(filterConversationPreviews(all, "secret"));
  }, [profile]);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  useEffect(() => {
    if (!profile || tab !== "discover") return;
    async function load() {
      let query = getSupabase()
        .from("profiles")
        .select("*")
        .neq("id", profile!.id)
        .order("created_at", { ascending: false })
        .limit(40);
      if (search.trim()) {
        query = query.or(`display_name.ilike.%${search}%,username.ilike.%${search}%`);
      }
      const { data } = await query;
      setDiscoverUsers((data as Profile[]) ?? []);
    }
    load();
  }, [tab, search, profile]);

  useEffect(() => {
    if (tab === "channels" && profile) {
      loadPublicChannels(getSupabase(), profile.id).then(setPublicChannels);
    }
    if (tab === "secret" && profile) {
      loadMutualFriends(getSupabase(), profile.id).then(setSecretFriends);
    }
  }, [tab, profile, conversations]);

  useEffect(() => {
    if (!activeChat?.convId) return;
    async function load() {
      let query = getSupabase()
        .from("messages")
        .select("*")
        .eq("conversation_id", activeChat!.convId)
        .order("created_at", { ascending: true });
      if (activeChat!.isSecret) {
        query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
      }
      const { data } = await query;
      setMessages((data as Message[]) ?? []);
    }
    load();

    const channel = getSupabase()
      .channel(`messages:${activeChat.convId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeChat.convId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
          refreshConversations();
        },
      )
      .subscribe();

    return () => {
      getSupabase().removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resubscribe only when conversation id changes
  }, [activeChat?.convId, refreshConversations]);

  useEffect(() => {
    if (!profile || !activeChat?.convId || activeChat.kind !== "dm" || !activeChat.otherUser) {
      setOtherMemberReadAt(null);
      return;
    }

    const supabase = getSupabase();
    const refresh = async () => {
      const cursors = await loadConversationReadCursors(supabase, activeChat.convId);
      setOtherMemberReadAt(pickOtherMemberReadAt(cursors, activeChat.otherUser!.id));
    };

    void refresh();
    void markConversationRead(supabase, profile.id, activeChat.convId, profile);
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
  }, [profile, activeChat?.convId, activeChat?.kind, activeChat?.otherUser?.id]);

  useEffect(() => {
    if (!profile || !activeChat?.convId || messages.length === 0) return;
    void markConversationRead(getSupabase(), profile.id, activeChat.convId, profile);
  }, [profile, activeChat?.convId, messages.length]);

  async function openById(convId: string) {
    if (!profile) return;
    setChatError(null);
    const chat = await loadActiveChat(getSupabase(), profile.id, convId);
    if (!chat) {
      setChatError("Could not open conversation.");
      return;
    }
    setActiveChat(chat);
    setTab("chats");
  }

  useEffect(() => {
    if (!profile || !deepLinkConvId) return;
    void openById(deepLinkConvId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open once when deep-link id is present
  }, [profile?.id, deepLinkConvId]);

  async function openDm(other: Profile, convId?: string, secret = false) {
    if (!profile) return;
    setChatError(null);
    if (!convId) {
      const { convId: createdId, error } = await findOrCreateConversation(
        getSupabase(),
        profile.id,
        other.id,
        { secret },
      );
      if (error) {
        setChatError(error);
        return;
      }
      if (!createdId) return;
      convId = createdId;
    }
    await openById(convId);
  }

  async function searchPhone() {
    setChatError(null);
    setPhoneResult(null);
    const { user, error } = await findUserByPhone(getSupabase(), phoneSearch);
    if (error) {
      setChatError(error);
      return;
    }
    setPhoneResult(user);
  }

  async function handleJoinChannel(convId: string) {
    if (!profile) return;
    const { error } = await joinChannel(getSupabase(), profile.id, convId);
    if (error) {
      setChatError(error);
      return;
    }
    await refreshConversations();
    await openById(convId);
  }

  async function handleStartCall(callType: "audio" | "video") {
    if (!activeChat?.convId || !profile) return;
    if (activeChat.kind === "channel") {
      setChatError("Calls are not available in channels.");
      return;
    }
    const token = (await getSupabase().auth.getSession()).data.session?.access_token;
    if (!token) return;
    const { data, error } = await startCall(activeChat.convId, callType, token);
    if (error) {
      setChatError(error);
      return;
    }
    Alert.alert(
      callType === "video" ? "Video call started" : "Voice call started",
      activeChat.kind === "group"
        ? "Group members can join on the web app. LiveKit mobile calls are coming soon."
        : "The other person will be notified. Join the call on the web app for now.",
    );
    void data;
  }

  async function startVoiceNote() {
    if (!activeChat?.convId || !profile) return;
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
    } catch {
      setChatError("Microphone permission required for voicemail.");
    }
  }

  async function stopVoiceNote() {
    if (!recording || !activeChat?.convId || !profile) return;
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    const status = await recording.getStatusAsync();
    setRecording(null);
    if (!uri) return;
    const duration =
      "durationMillis" in status && typeof status.durationMillis === "number"
        ? status.durationMillis / 1000
        : 1;
    const { error } = await sendVoiceMessageFromUri(
      getSupabase(),
      activeChat.convId,
      profile.id,
      uri,
      duration,
      activeChat.isSecret ? secretMessageExpiry() : null,
    );
    if (error) setChatError(error);
    else refreshConversations();
  }

  async function sendMessage() {
    if (!draft.trim() || !activeChat?.convId || !profile || !activeChat.canPost) return;
    setChatError(null);
    const content = draft.trim();
    setDraft("");

    const { error } = await getSupabase().from("messages").insert({
      conversation_id: activeChat.convId,
      sender_id: profile.id,
      content,
      ...(activeChat.isSecret ? { expires_at: secretMessageExpiry() } : {}),
    });

    if (error) {
      setChatError(
        error.message.includes("row-level security")
          ? "You cannot send messages here."
          : error.message,
      );
      setDraft(content);
      return;
    }
    refreshConversations();
  }

  if (!profile) return <Loader />;

  if (activeChat) {
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.chatHeader}>
          <Pressable onPress={() => setActiveChat(null)}>
            <Text style={styles.back}>← Back</Text>
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.chatTitle}>{activeChat.title}</Text>
            <Text style={styles.chatSub}>{activeChat.subtitle}</Text>
          </View>
          {activeChat.kind !== "channel" && (
            <View style={styles.callBtns}>
              <Pressable onPress={() => handleStartCall("audio")} style={styles.callBtn}>
                <Text style={styles.callBtnText}>Call</Text>
              </Pressable>
              <Pressable onPress={() => handleStartCall("video")} style={styles.callBtn}>
                <Text style={styles.callBtnText}>Video</Text>
              </Pressable>
            </View>
          )}
        </View>
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.messages}
          renderItem={({ item }) => {
            const mine = item.sender_id === profile.id;
            const sender = activeChat.members?.find((m) => m.id === item.sender_id);
            return (
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                {!mine && activeChat.kind !== "dm" && (
                  <Text style={styles.sender}>{sender?.display_name ?? "Member"}</Text>
                )}
                {item.message_type === "voice" ? (
                  <Text style={mine ? styles.bubbleTextMine : styles.bubbleText}>
                    🎤 {item.content}
                  </Text>
                ) : item.message_type === "call_log" ? (
                  <Text style={[mine ? styles.bubbleTextMine : styles.bubbleText, styles.callLog]}>
                    {item.content}
                  </Text>
                ) : (
                  <Text style={mine ? styles.bubbleTextMine : styles.bubbleText}>{item.content}</Text>
                )}
                <View style={styles.timeRow}>
                  <Text style={[styles.time, mine && styles.timeMine]}>
                    {formatMessageTime(item.created_at)}
                  </Text>
                  {mine &&
                    activeChat.kind === "dm" &&
                    activeChat.otherUser &&
                    !item.deleted_at && (
                      <Text style={styles.readReceipt}>
                        {isMessageReadByOther(item, otherMemberReadAt) ? " ✓✓ Read" : " ✓ Sent"}
                      </Text>
                    )}
                </View>
              </View>
            );
          }}
        />
        {chatError ? <Text style={styles.error}>{chatError}</Text> : null}
        {activeChat.canPost ? (
          <View style={styles.composer}>
            {recording ? (
              <Pressable onPress={stopVoiceNote} style={styles.voiceRecording}>
                <Text style={styles.sendText}>■ Send voicemail</Text>
              </Pressable>
            ) : (
              <Pressable onPress={startVoiceNote} style={styles.micBtn}>
                <Text style={styles.sendText}>🎤</Text>
              </Pressable>
            )}
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={activeChat.kind === "channel" ? "Post update…" : "Message…"}
              placeholderTextColor={colors.inkMuted}
              style={styles.input}
            />
            <Pressable onPress={sendMessage} style={styles.send}>
              <Text style={styles.sendText}>Send</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.readOnly}>Subscribers can read — only admins post.</Text>
        )}
      </KeyboardAvoidingView>
    );
  }

  return (
    <Screen>
      <Title>Chat</Title>
      <Subtitle>DMs, groups, channels & phone</Subtitle>
      <View style={styles.createRow}>
        <Btn label="Group" onPress={() => router.push("/chat/create-group" as Href)} variant="outline" />
        <Btn label="Channel" onPress={() => router.push("/chat/create-channel" as Href)} variant="outline" />
      </View>
      {chatError ? <Text style={styles.error}>{chatError}</Text> : null}
      <View style={styles.tabs}>
        {(["chats", "secret", "discover", "phone", "channels"] as Tab[]).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={tab === t ? styles.tabTextActive : styles.tabText}>
              {t === "secret" ? "🔒 Secret" : t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </Pressable>
        ))}
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

      {tab === "phone" && (
        <View>
          <TextInput
            value={phoneSearch}
            onChangeText={setPhoneSearch}
            placeholder="+2348012345678"
            placeholderTextColor={colors.inkMuted}
            style={styles.search}
          />
          <Btn label="Find by phone" onPress={searchPhone} />
          {phoneResult && (
            <Pressable style={styles.row} onPress={() => openDm(phoneResult)}>
              <Avatar name={phoneResult.display_name} avatarUrl={phoneResult.avatar_url} />
              <View style={styles.rowText}>
                <Text style={styles.name}>{phoneResult.display_name}</Text>
                <Text style={styles.preview}>@{phoneResult.username}</Text>
              </View>
            </Pressable>
          )}
        </View>
      )}

      {tab === "secret" && (
        <>
          <Text style={styles.hint}>
            Private chats hidden from main list. Messages delete after 24 hours.
          </Text>
          <FlatList
            data={secretChats}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable style={styles.row} onPress={() => openById(item.id)}>
                <Text style={styles.secretIcon}>🔒</Text>
                <View style={styles.rowText}>
                  <Text style={styles.name}>{item.other_user?.display_name ?? "Secret"}</Text>
                  <Text style={styles.preview} numberOfLines={1}>
                    {item.last_message ?? "Open secret chat"}
                  </Text>
                </View>
              </Pressable>
            )}
            ListEmptyComponent={<Text style={styles.empty}>No secret chats yet.</Text>}
          />
          <Text style={styles.hint}>Start secret chat with a friend:</Text>
          <FlatList
            data={secretFriends}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable style={styles.row} onPress={() => openDm(item, undefined, true)}>
                <Avatar name={item.display_name} avatarUrl={item.avatar_url} size="sm" />
                <Text style={styles.name}>{item.display_name}</Text>
              </Pressable>
            )}
          />
        </>
      )}

      {tab === "chats" && (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => openById(item.id)}>
              <Avatar
                name={conversationLabel(item)}
                avatarUrl={item.other_user?.avatar_url ?? null}
              />
              <View style={styles.rowText}>
                <Text style={styles.name}>{conversationLabel(item)}</Text>
                <Text style={styles.preview} numberOfLines={1}>
                  {item.kind !== "dm"
                    ? `${item.kind} · ${item.last_message ?? "No messages"}`
                    : (item.last_message ?? "Start chatting")}
                </Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No conversations yet.</Text>}
        />
      )}

      {tab === "discover" && (
        <FlatList
          data={discoverUsers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => openDm(item)}>
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

      {tab === "channels" && (
        <FlatList
          data={publicChannels}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => handleJoinChannel(item.id)}>
              <View style={styles.channelIcon}>
                <Text style={styles.channelHash}>#</Text>
              </View>
              <View style={styles.rowText}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.preview} numberOfLines={1}>{item.last_message}</Text>
              </View>
              <Text style={styles.join}>Join</Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No public channels.</Text>}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  createRow: { flexDirection: "row", gap: 8, marginBottom: spacing.sm },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.paper,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  headerText: { flex: 1 },
  back: { color: colors.rust, fontWeight: "600" },
  chatTitle: { fontSize: 18, fontWeight: "700", color: colors.ink },
  chatSub: { fontSize: 12, color: colors.inkMuted },
  messages: { padding: spacing.md, flexGrow: 1 },
  bubble: { maxWidth: "80%", marginBottom: 8, padding: 10, borderRadius: 8 },
  bubbleMine: { alignSelf: "flex-end", backgroundColor: colors.rust },
  bubbleTheirs: { alignSelf: "flex-start", backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border },
  sender: { fontSize: 10, fontWeight: "700", color: colors.rust, marginBottom: 2 },
  bubbleText: { color: colors.ink },
  bubbleTextMine: { color: colors.btnText },
  timeRow: { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 4 },
  time: { fontSize: 10, opacity: 0.7, color: colors.inkMuted },
  timeMine: { color: colors.btnText },
  readReceipt: { fontSize: 10, color: colors.btnText, opacity: 0.85, fontWeight: "600" },
  readOnly: { textAlign: "center", padding: spacing.md, color: colors.inkMuted, fontSize: 12 },
  composer: { flexDirection: "row", padding: spacing.sm, gap: 8, borderTopWidth: 2, borderTopColor: colors.border, backgroundColor: colors.paper },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 8, color: colors.ink },
  send: { justifyContent: "center", paddingHorizontal: 12 },
  sendText: { color: colors.rust, fontWeight: "700" },
  tabs: { flexDirection: "row", flexWrap: "wrap", marginBottom: spacing.sm, gap: 6 },
  tab: { paddingVertical: 8, paddingHorizontal: 10, borderWidth: 2, borderColor: colors.border, borderRadius: 4 },
  tabActive: { backgroundColor: colors.rust, borderColor: colors.rustDark },
  tabText: { color: colors.inkMuted, fontWeight: "600", fontSize: 12 },
  tabTextActive: { color: colors.btnText, fontWeight: "600", fontSize: 12 },
  search: { borderWidth: 2, borderColor: colors.border, borderRadius: 4, padding: 10, marginBottom: spacing.sm, color: colors.ink, backgroundColor: colors.white },
  row: { flexDirection: "row", gap: spacing.sm, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: "center" },
  rowText: { flex: 1 },
  name: { fontWeight: "700", color: colors.ink },
  preview: { fontSize: 13, color: colors.inkMuted },
  empty: { textAlign: "center", color: colors.inkMuted, marginTop: 24 },
  error: { color: colors.rust, fontSize: 13, marginBottom: spacing.sm },
  hint: { fontSize: 12, color: colors.inkMuted, marginBottom: spacing.sm },
  channelIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.rust + "22", alignItems: "center", justifyContent: "center" },
  channelHash: { color: colors.rust, fontWeight: "800", fontSize: 18 },
  join: { color: colors.rust, fontWeight: "700", fontSize: 13 },
  callBtns: { flexDirection: "row", gap: 6 },
  callBtn: { borderWidth: 1, borderColor: colors.rust, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  callBtnText: { color: colors.rust, fontWeight: "700", fontSize: 12 },
  micBtn: { justifyContent: "center", paddingHorizontal: 8 },
  voiceRecording: { flex: 1, justifyContent: "center", paddingHorizontal: 8 },
  callLog: { fontStyle: "italic" },
  secretIcon: { fontSize: 20, width: 40, textAlign: "center" },
});
