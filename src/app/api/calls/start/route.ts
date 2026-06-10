import { NextResponse } from "next/server";
import { canStartCall } from "@/lib/calls";
import { isLiveKitConfigured } from "@/lib/livekit";
import { createAuthenticatedClient } from "@/lib/supabase/route-auth";

export async function POST(request: Request) {
  if (!isLiveKitConfigured()) {
    return NextResponse.json({ error: "Calls not configured (LiveKit)" }, { status: 503 });
  }

  const { supabase, user } = await createAuthenticatedClient(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const conversationId = body.conversationId as string | undefined;
  const callType = body.callType as "audio" | "video" | undefined;

  if (!conversationId || !callType || !["audio", "video"].includes(callType)) {
    return NextResponse.json({ error: "conversationId and callType required" }, { status: 400 });
  }

  const access = await canStartCall(supabase, user.id, conversationId);
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: 403 });
  }

  const { data: conv } = await supabase
    .from("conversations")
    .select("kind")
    .eq("id", conversationId)
    .single();

  const roomName = `call-${crypto.randomUUID()}`;
  const initialStatus = conv?.kind === "group" ? "active" : "ringing";

  const { data: session, error } = await supabase
    .from("call_sessions")
    .insert({
      conversation_id: conversationId,
      room_name: roomName,
      call_type: callType,
      status: initialStatus,
      initiator_id: user.id,
    })
    .select("*")
    .single();

  if (error || !session) {
    return NextResponse.json({ error: error?.message ?? "Could not start call" }, { status: 500 });
  }

  return NextResponse.json({ session });
}
