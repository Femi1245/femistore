import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  ensureAssistantUser,
  getOrCreateAssistantConversation,
} from "@/lib/assistant";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const { convId, assistant } = await getOrCreateAssistantConversation(user.id);
    return NextResponse.json({ convId, assistant });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not open assistant chat.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const assistant = await ensureAssistantUser();
    return NextResponse.json({ assistant });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Assistant unavailable.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
