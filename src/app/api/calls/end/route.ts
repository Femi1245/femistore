import { NextResponse } from "next/server";
import { callTypeLabel, isConversationMember, loadCallSession } from "@/lib/calls";
import { createAuthenticatedClient } from "@/lib/supabase/route-auth";

export async function POST(request: Request) {
  const { supabase, user } = await createAuthenticatedClient(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const sessionId = body.sessionId as string | undefined;
  const missed = body.missed === true;

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const session = await loadCallSession(supabase, sessionId);
  if (!session) {
    return NextResponse.json({ error: "Call not found" }, { status: 404 });
  }

  const member = await isConversationMember(supabase, user.id, session.conversation_id);
  if (!member) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const status = missed ? "missed" : "ended";
  const endedAt = new Date().toISOString();

  const { data: updated, error } = await supabase
    .from("call_sessions")
    .update({ status, ended_at: endedAt })
    .eq("id", sessionId)
    .in("status", ["ringing", "active"])
    .select("*")
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: error?.message ?? "Call already ended" }, { status: 409 });
  }

  const durationSec = Math.max(
    0,
    Math.round((new Date(endedAt).getTime() - new Date(session.started_at).getTime()) / 1000),
  );

  const logContent =
    status === "missed"
      ? `Missed ${callTypeLabel(session.call_type).toLowerCase()}`
      : `${callTypeLabel(session.call_type)} · ${Math.floor(durationSec / 60)}:${(durationSec % 60).toString().padStart(2, "0")}`;

  await supabase.from("messages").insert({
    conversation_id: session.conversation_id,
    sender_id: session.initiator_id,
    content: logContent,
    message_type: "call_log",
  });

  return NextResponse.json({ session: updated });
}
