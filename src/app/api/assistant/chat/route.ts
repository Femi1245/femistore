import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  type ChatTurn,
  ensureAssistantUser,
  generateAssistantReply,
  getOrCreateAssistantConversation,
  insertAssistantReply,
  loadRecentConversationMessages,
} from "@/lib/assistant";

type Body = {
  message?: string;
  conversationId?: string;
  history?: ChatTurn[];
};

async function ensureUserMessageInConversation(
  conversationId: string,
  userId: string,
  message: string,
): Promise<void> {
  const admin = createAdminClient();
  const { data: latest } = await admin
    .from("messages")
    .select("content, sender_id")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest?.sender_id === userId && latest.content === message) return;

  const supabase = await createClient();
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: userId,
    content: message,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const assistant = await ensureAssistantUser();

    if (user && body.conversationId) {
      const { data: membership } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("conversation_id", body.conversationId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!membership) {
        return NextResponse.json({ error: "Conversation not found." }, { status: 403 });
      }

      await ensureUserMessageInConversation(body.conversationId, user.id, message);

      const history = await loadRecentConversationMessages(
        body.conversationId,
        assistant.id,
      );
      const { reply, provider } = await generateAssistantReply(history);
      const saved = await insertAssistantReply(body.conversationId, assistant.id, reply);

      return NextResponse.json({ reply, messageId: saved.id, source: provider });
    }

    if (user) {
      const { convId } = await getOrCreateAssistantConversation(user.id);

      await ensureUserMessageInConversation(convId, user.id, message);

      const history = await loadRecentConversationMessages(convId, assistant.id);
      const { reply, provider } = await generateAssistantReply(history);
      const saved = await insertAssistantReply(convId, assistant.id, reply);

      return NextResponse.json({
        reply,
        conversationId: convId,
        messageId: saved.id,
        source: provider,
      });
    }

    const history = body.history ?? [];
    const { reply, provider } = await generateAssistantReply(history, message);
    return NextResponse.json({ reply, source: provider });
  } catch (err) {
    const text = err instanceof Error ? err.message : "Assistant error.";
    return NextResponse.json({ error: text }, { status: 500 });
  }
}
