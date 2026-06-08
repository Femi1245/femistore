import { NextResponse } from "next/server";
import { createLiveKitToken, getLiveKitUrl, isLiveKitConfigured } from "@/lib/livekit";
import { createAuthenticatedClient } from "@/lib/supabase/route-auth";

export async function GET(request: Request) {
  if (!isLiveKitConfigured()) {
    return NextResponse.json({ error: "Live video not configured" }, { status: 503 });
  }

  const { supabase, user } = await createAuthenticatedClient(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roomName = new URL(request.url).searchParams.get("room");
  if (!roomName) {
    return NextResponse.json({ error: "room required" }, { status: 400 });
  }

  const { data: stream } = await supabase
    .from("live_streams")
    .select("*")
    .eq("room_name", roomName)
    .eq("is_live", true)
    .maybeSingle();

  if (!stream) {
    return NextResponse.json({ error: "Stream not found or ended" }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const isHost = stream.host_id === user.id;

  const token = await createLiveKitToken({
    roomName,
    identity: user.id,
    name: profile?.display_name ?? "Viewer",
    canPublish: isHost,
  });

  return NextResponse.json({
    token,
    serverUrl: getLiveKitUrl(),
    isHost,
    stream,
  });
}
