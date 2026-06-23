import { NextResponse } from "next/server";
import { createLiveKitToken, getLiveKitUrl, isLiveKitConfigured } from "@/lib/livekit";
import { createAuthenticatedClient } from "@/lib/supabase/route-auth";

export async function POST(request: Request) {
  if (!isLiveKitConfigured()) {
    return NextResponse.json(
      {
        error:
          "Voice rooms need LiveKit. Add LIVEKIT_* keys to .env.local — https://cloud.livekit.io",
      },
      { status: 503 },
    );
  }

  const { supabase, user } = await createAuthenticatedClient(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  const topic = String(body.topic ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const roomName = `voice-${user.id.slice(0, 8)}-${Date.now()}`;

  const { data: room, error } = await supabase
    .from("voice_rooms")
    .insert({
      host_id: user.id,
      title,
      topic,
      room_name: roomName,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST205") {
      return NextResponse.json(
        { error: "Run supabase/voice-close-friends-payments-schema.sql first." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const token = await createLiveKitToken({
    roomName,
    identity: user.id,
    name: profile?.display_name ?? "Host",
    canPublish: true,
  });

  return NextResponse.json({
    room,
    token,
    serverUrl: getLiveKitUrl(),
  });
}
