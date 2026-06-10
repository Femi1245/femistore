import { NextResponse } from "next/server";
import { isConversationMember, loadCallSession } from "@/lib/calls";
import { createLiveKitToken, getLiveKitUrl, isLiveKitConfigured } from "@/lib/livekit";
import { createAuthenticatedClient } from "@/lib/supabase/route-auth";

export async function GET(request: Request) {
  if (!isLiveKitConfigured()) {
    return NextResponse.json({ error: "Calls not configured" }, { status: 503 });
  }

  const { supabase, user } = await createAuthenticatedClient(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionId = new URL(request.url).searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const session = await loadCallSession(supabase, sessionId);
  if (!session) {
    return NextResponse.json({ error: "Call not found" }, { status: 404 });
  }

  if (!["ringing", "active"].includes(session.status)) {
    return NextResponse.json({ error: "Call has ended" }, { status: 410 });
  }

  const member = await isConversationMember(supabase, user.id, session.conversation_id);
  if (!member) {
    return NextResponse.json({ error: "Not a member of this conversation" }, { status: 403 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const token = await createLiveKitToken({
    roomName: session.room_name,
    identity: user.id,
    name: profile?.display_name ?? "User",
    canPublish: true,
  });

  return NextResponse.json({
    token,
    serverUrl: getLiveKitUrl(),
    session,
  });
}
