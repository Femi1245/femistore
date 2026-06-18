import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { chatComplete } from "@/lib/llm";
import type { Message, Profile } from "@/lib/types";

export const ASSISTANT_USERNAME = "zumelia-ai";
export const ASSISTANT_DISPLAY_NAME = "Zumelia AI";
export const ASSISTANT_EMAIL = "zumelia-ai@assistant.zumelia.app";

const SYSTEM_PROMPT = `You are Zumelia AI — a friendly, capable general-purpose assistant inside the Zumelia social app.

Your job is to answer ANY question the user asks. That includes general knowledge, explanations, math, science, history, coding, writing, brainstorming, advice, translations, and casual conversation. Do not refuse or deflect non-app questions — answer them directly and helpfully.

You also know about Zumelia when users ask about the app:
- Feed (posts, stories, follow people), Chat (DMs, groups, channels, secret chats, voice, calls, gifts)
- Live streaming, Watch videos, Games, business profiles, Discover businesses (/discover/businesses)
- Profile at /profile/[username], business setup via Profile → Edit profile

Guidelines:
- Be warm, clear, and concise. Use markdown lists or code blocks when they help.
- If you don't know something, say so honestly — don't guess.
- For Zumelia account-specific details you can't see, tell the user where to look in the app.
- Never invent Zumelia features that don't exist.`;

export const BUSINESS_AUTO_REPLY_PROMPT = `You draft short auto-replies for a business on Zumelia. Write as the business (first person or "we"), warm and professional. Follow the business instructions in the user message. Stay on topic; do not mention being Zumelia AI.`;

export type ChatTurn = { role: "user" | "assistant"; content: string };

export function isAssistantProfile(profile: Pick<Profile, "username" | "id">): boolean {
  return profile.username === ASSISTANT_USERNAME;
}

export async function getAssistantProfile(
  supabase: SupabaseClient,
): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", ASSISTANT_USERNAME)
    .maybeSingle();
  return (data as Profile) ?? null;
}

export async function ensureAssistantUser(): Promise<Profile> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("profiles")
    .select("*")
    .eq("username", ASSISTANT_USERNAME)
    .maybeSingle();

  if (existing) return existing as Profile;

  const email = ASSISTANT_EMAIL;
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      display_name: ASSISTANT_DISPLAY_NAME,
      username: ASSISTANT_USERNAME,
    },
  });

  let userId: string | null = authData?.user?.id ?? null;

  if (authError || !userId) {
    const msg = authError?.message?.toLowerCase() ?? "";
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
      const { data: listed } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const found = listed?.users?.find((u) => u.email === email);
      if (found) userId = found.id;
    }
    if (!userId) {
      throw new Error(authError?.message ?? "Could not create assistant account.");
    }
  }

  let { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!profile) {
    const { data: inserted, error: insertError } = await admin
      .from("profiles")
      .insert({
        id: userId,
        username: ASSISTANT_USERNAME,
        display_name: ASSISTANT_DISPLAY_NAME,
        country: "Global",
        bio: "Your AI assistant — ask me anything: general questions, ideas, coding, or help with Zumelia.",
      })
      .select()
      .single();

    if (insertError || !inserted) {
      throw new Error(insertError?.message ?? "Could not create assistant profile.");
    }
    return inserted as Profile;
  }

  if (profile.username !== ASSISTANT_USERNAME) {
    const { data: updated, error: updateError } = await admin
      .from("profiles")
      .update({
        username: ASSISTANT_USERNAME,
        display_name: ASSISTANT_DISPLAY_NAME,
        bio: "Your AI assistant — ask me anything: general questions, ideas, coding, or help with Zumelia.",
      })
      .eq("id", userId)
      .select()
      .single();

    if (updateError || !updated) {
      throw new Error(updateError?.message ?? "Could not update assistant profile.");
    }
    return updated as Profile;
  }

  return profile as Profile;
}

export async function getOrCreateAssistantConversation(
  userId: string,
): Promise<{ convId: string; assistant: Profile }> {
  const admin = createAdminClient();
  const assistant = await ensureAssistantUser();

  const { data: myConvs } = await admin
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", userId);

  const myIds = (myConvs ?? []).map((c) => c.conversation_id);

  if (myIds.length > 0) {
    const { data: shared } = await admin
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", assistant.id)
      .in("conversation_id", myIds);

    for (const row of shared ?? []) {
      const { data: dm } = await admin
        .from("conversations")
        .select("id")
        .eq("id", row.conversation_id)
        .eq("kind", "dm")
        .eq("is_secret", false)
        .maybeSingle();

      if (dm) return { convId: dm.id, assistant };
    }
  }

  const { data: conv, error: convError } = await admin
    .from("conversations")
    .insert({ kind: "dm", created_by: userId, is_secret: false })
    .select("id")
    .single();

  if (convError || !conv) {
    throw new Error(convError?.message ?? "Could not create assistant conversation.");
  }

  const { error: memberError } = await admin.from("conversation_members").insert([
    { conversation_id: conv.id, user_id: userId, role: "member" },
    { conversation_id: conv.id, user_id: assistant.id, role: "member" },
  ]);

  if (memberError) {
    throw new Error(memberError.message);
  }

  return { convId: conv.id, assistant };
}

export async function loadRecentConversationMessages(
  conversationId: string,
  assistantId: string,
  limit = 20,
): Promise<ChatTurn[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("messages")
    .select("content, sender_id")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data?.length) return [];

  return [...data].reverse().map((row) => ({
    role: row.sender_id === assistantId ? ("assistant" as const) : ("user" as const),
    content: row.content as string,
  }));
}

export async function insertAssistantReply(
  conversationId: string,
  assistantId: string,
  content: string,
): Promise<Message> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: assistantId,
      content: content.slice(0, 4000),
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not save assistant reply.");
  }

  return data as Message;
}

export async function generateAssistantReply(
  history: ChatTurn[],
  userMessage?: string,
  options?: { systemPrompt?: string },
): Promise<{ reply: string; provider: string }> {
  let messages = history.slice(-12);
  const trimmed = userMessage?.trim();

  if (trimmed) {
    const last = messages[messages.length - 1];
    if (!(last?.role === "user" && last.content === trimmed)) {
      messages = [...messages, { role: "user", content: trimmed }];
    }
  }

  if (messages.length === 0) {
    const text = fallbackReply(trimmed ?? "");
    return { reply: text, provider: "fallback" };
  }

  const llmMessages = [
    { role: "system" as const, content: options?.systemPrompt ?? SYSTEM_PROMPT },
    ...messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  const result = await chatComplete(llmMessages, { maxTokens: 1500, temperature: 0.7 });

  if (result.text) {
    return { reply: result.text, provider: result.provider };
  }

  const lastUser =
    trimmed ?? messages.filter((m) => m.role === "user").at(-1)?.content ?? "";

  if (result.error && result.provider !== "fallback") {
    return {
      reply: `Groq error: ${result.error}\n\n${fallbackReply(lastUser)}`,
      provider: "fallback",
    };
  }

  return { reply: fallbackReply(lastUser), provider: "fallback" };
}

function fallbackReply(message: string): string {
  const q = message.toLowerCase();

  if (q.includes("business") || q.includes("advertise") || q.includes("showcase")) {
    return `To showcase your business on Zumelia:
1. Go to Profile → Edit profile → **Create business profile**, or sign up as Business.
2. Add your name, category, description, services, and contact details.
3. Use the **Personal / Business** switcher in the top nav when posting.
4. Get discovered at **Discover businesses** (/discover/businesses).

Tell me your industry and I can suggest what to put in your description.`;
  }

  if (q.includes("chat") || q.includes("message") || q.includes("friend")) {
    return `On Zumelia Chat you can DM mutual friends (both follow each other), create groups and channels, use secret chats, send voice notes, gifts, and calls. Open **Chat** from the nav, or tap **Discover** to find people. You can always message **Zumelia AI** (me) without being friends.`;
  }

  if (q.includes("gift") || q.includes("pay")) {
    return `Send gifts in a chat: open a conversation, tap the gift icon, pick a gift, and complete checkout. Gifts work in demo mode without Paystack; add PAYSTACK_SECRET_KEY for real payments.`;
  }

  if (q.includes("live") || q.includes("stream")) {
    return `Go **Live** from the nav → start a stream. Friends and followers can watch and chat in real time. Make sure LiveKit env vars are set in your deployment.`;
  }

  if (q.includes("hello") || q.includes("hi") || q === "hey") {
    return `Hi! I'm Zumelia AI. Ask me anything — general questions, homework help, coding, writing ideas, or how to use Zumelia.`;
  }

  return `I'm Zumelia AI. I can answer general questions on almost any topic, plus help you navigate Zumelia (feed, chat, live, business profiles, and more).

What would you like to know?`;
}
