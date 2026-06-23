import { NextResponse } from "next/server";
import { createLiveKitToken, getLiveKitUrl, isLiveKitConfigured } from "@/lib/livekit";
import { createAuthenticatedClient } from "@/lib/supabase/route-auth";

export async function GET(request: Request) {
  if (!isLiveKitConfigured()) {
    return NextResponse.json({ error: "Voice not configured" }, { status: 503 });
  }

  const { supabase, user } = await createAuthenticatedClient(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roomName = new URL(request.url).searchParams.get("room");
  if (!roomName) {
    return NextResponse.json({ error: "room required" }, { status: 400 });
  }

  const { data: room } = await supabase
    .from("voice_rooms")
    .select("*")
    .eq("room_name", roomName)
    .eq("is_active", true)
    .maybeSingle();

  if (!room) {
    return NextResponse.json({ error: "Lounge not found or ended" }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const token = await createLiveKitToken({
    roomName,
    identity: user.id,
    name: profile?.display_name ?? "Guest",
    canPublish: true,
  });

  return NextResponse.json({
    token,
    serverUrl: getLiveKitUrl(),
    isHost: room.host_id === user.id,
    room,
  });
}
