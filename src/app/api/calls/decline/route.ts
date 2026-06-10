import { NextResponse } from "next/server";
import { callTypeLabel, isConversationMember, loadCallSession } from "@/lib/calls";
import { createAuthenticatedClient } from "@/lib/supabase/route-auth";

export async function POST(request: Request) {
  const { supabase, user } = await createAuthenticatedClient(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const sessionId = body.sessionId as string | undefined;
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const session = await loadCallSession(supabase, sessionId);
  if (!session) {
    return NextResponse.json({ error: "Call not found" }, { status: 404 });
  }

  if (session.status !== "ringing") {
    return NextResponse.json({ error: "Call is no longer ringing" }, { status: 409 });
  }

  const member = await isConversationMember(supabase, user.id, session.conversation_id);
  if (!member) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const { data: updated, error } = await supabase
    .from("call_sessions")
    .update({ status: "declined", ended_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("status", "ringing")
    .select("*")
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: error?.message ?? "Could not decline" }, { status: 409 });
  }

  await supabase.from("messages").insert({
    conversation_id: session.conversation_id,
    sender_id: session.initiator_id,
    content: `Declined ${callTypeLabel(session.call_type).toLowerCase()}`,
    message_type: "call_log",
  });

  return NextResponse.json({ session: updated });
}
