import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Message, Profile } from "@/lib/types";

export const ASSISTANT_USERNAME = "zumelia-ai";
export const ASSISTANT_DISPLAY_NAME = "Zumelia AI";
export const ASSISTANT_EMAIL = "zumelia-ai@assistant.zumelia.app";

const SYSTEM_PROMPT = `You are Zumelia AI, the helpful assistant for Zumelia — a global social app with chat, feed, live streaming, watch, games, gifts, and business profiles.

Help users with anything they ask: app navigation, social tips, business profile advice, content ideas, general questions, and creative tasks. Be warm, concise, and practical.

Zumelia features users can use:
- Feed: post updates, stories, follow people
- Chat: DMs (mutual friends), groups, channels, secret chats, voice messages, calls, gifts
- Discover businesses: /discover/businesses
- Business profiles: signup or upgrade from personal, switch personal/business mode in nav
- Live streaming, Watch videos, Games
- Profile at /profile/[username]

If you don't know something specific about the user's account, say so and suggest where to look in the app. Never make up features that don't exist.`;

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
        bio: "Your Zumelia assistant — ask me anything about the app, your business, or everyday topics.",
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
        bio: "Your Zumelia assistant — ask me anything about the app, your business, or everyday topics.",
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
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  let messages = history.slice(-12);
  const trimmed = userMessage?.trim();

  if (trimmed) {
    const last = messages[messages.length - 1];
    if (!(last?.role === "user" && last.content === trimmed)) {
      messages = [...messages, { role: "user", content: trimmed }];
    }
  }

  if (messages.length === 0) {
    return fallbackReply(trimmed ?? "");
  }

  if (apiKey) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (res.ok) {
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = json.choices?.[0]?.message?.content?.trim();
      if (text) return text;
      throw new Error("OpenAI returned an empty response.");
    }

    const errBody = (await res.json().catch(() => ({}))) as {
      error?: { message?: string; code?: string };
    };
    const errMsg = errBody.error?.message ?? `OpenAI request failed (${res.status}).`;

    if ([401, 402, 429].includes(res.status)) {
      const hint =
        res.status === 429
          ? "Your OpenAI account has no remaining quota. Add billing at platform.openai.com, then try again."
          : res.status === 401
            ? "Your OpenAI API key was rejected. Check OPENAI_API_KEY in .env.local (local) or Vercel env (production)."
            : "OpenAI billing is required for this key.";
      const lastUser =
        trimmed ?? messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
      return `${hint}\n\n${fallbackReply(lastUser)}`;
    }

    throw new Error(errMsg);
  }

  return fallbackReply(trimmed ?? messages[messages.length - 1]?.content ?? "");
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
    return `Hi! I'm Zumelia AI. Ask me about the app, growing your business profile, what to post, or anything else — I'm here to help.`;
  }

  return `I'm Zumelia AI. I can help with the app (feed, chat, live, watch, games, business profiles), ideas for your posts, or general questions.

What would you like help with?`;
}
