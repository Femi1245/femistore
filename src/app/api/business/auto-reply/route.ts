import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendBusinessAutoReply } from "@/lib/business-auto-reply";
import type { Profile } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      conversationId?: string;
      message?: string;
      businessUserId?: string;
    };

    if (!body.conversationId || !body.message?.trim() || !body.businessUserId) {
      return NextResponse.json({ error: "Missing fields." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("conversation_id", body.conversationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 403 });
    }

    const { data: business } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", body.businessUserId)
      .maybeSingle();

    if (!business) {
      return NextResponse.json({ error: "Business not found." }, { status: 404 });
    }

    const saved = await sendBusinessAutoReply(
      body.conversationId,
      business as Profile,
      body.message.trim(),
    );

    if (!saved) {
      return NextResponse.json({ skipped: true });
    }

    return NextResponse.json({ reply: saved.content, messageId: saved.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Auto-reply failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
