import { NextResponse } from "next/server";
import { createLiveKitToken, getLiveKitUrl, isLiveKitConfigured } from "@/lib/livekit";
import { createAuthenticatedClient } from "@/lib/supabase/route-auth";

export async function POST(request: Request) {
  if (!isLiveKitConfigured()) {
    return NextResponse.json(
      {
        error:
          "Live video is not configured. Add LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and NEXT_PUBLIC_LIVEKIT_URL to .env.local. Get free keys at https://cloud.livekit.io",
      },
      { status: 503 },
    );
  }

  const { supabase, user } = await createAuthenticatedClient(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const title = String(body.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const roomName = `live-${user.id.slice(0, 8)}-${Date.now()}`;

  const { data: stream, error } = await supabase
    .from("live_streams")
    .insert({
      host_id: user.id,
      title,
      room_name: roomName,
      is_live: true,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST205") {
      return NextResponse.json(
        { error: "Run supabase/live-schema.sql in your Supabase SQL Editor first." },
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
    stream,
    token,
    serverUrl: getLiveKitUrl(),
  });
}
