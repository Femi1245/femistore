import { NextResponse } from "next/server";
import { isConversationMember, loadCallSession } from "@/lib/calls";
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

  if (!["ringing", "active"].includes(session.status)) {
    return NextResponse.json({ error: "Call has ended" }, { status: 409 });
  }

  const member = await isConversationMember(supabase, user.id, session.conversation_id);
  if (!member) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  if (session.status === "active") {
    return NextResponse.json({ session });
  }

  const { data: updated, error } = await supabase
    .from("call_sessions")
    .update({ status: "active" })
    .eq("id", sessionId)
    .select("*")
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: error?.message ?? "Could not answer" }, { status: 500 });
  }

  return NextResponse.json({ session: updated });
}
