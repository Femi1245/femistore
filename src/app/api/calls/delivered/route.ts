import { NextResponse } from "next/server";
import { isConversationMember, loadCallSession } from "@/lib/calls";
import { createAuthenticatedClient } from "@/lib/supabase/route-auth";

/** Callee acknowledges the incoming call reached their device (realtime + UI). */
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
    return NextResponse.json({ session });
  }

  const member = await isConversationMember(supabase, user.id, session.conversation_id);
  if (!member) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  if (session.initiator_id === user.id) {
    return NextResponse.json({ error: "Only the recipient can confirm delivery" }, { status: 403 });
  }

  if (session.delivered_at) {
    return NextResponse.json({ session });
  }

  const { data: updated, error } = await supabase
    .from("call_sessions")
    .update({ delivered_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("status", "ringing")
    .is("delivered_at", null)
    .select("*")
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: error?.message ?? "Could not confirm delivery" }, { status: 409 });
  }

  return NextResponse.json({ session: updated });
}
