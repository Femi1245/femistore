import { NextResponse } from "next/server";
import { isLiveKitConfigured } from "@/lib/livekit";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const liveKitReady = isLiveKitConfigured();
  let databaseReady = false;
  let databaseMessage: string | undefined;

  if (liveKitReady) {
    const supabase = await createClient();
    const { error } = await supabase.from("live_streams").select("id").limit(1);

    if (error?.code === "PGRST205") {
      databaseMessage =
        "Run supabase/live-schema.sql in Supabase SQL Editor.";
    } else if (error) {
      databaseMessage = error.message;
    } else {
      databaseReady = true;
    }
  }

  const ready = liveKitReady && databaseReady;

  let message: string | undefined;
  if (!liveKitReady) {
    message =
      "Add LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and NEXT_PUBLIC_LIVEKIT_URL to .env.local. Free keys at cloud.livekit.io";
  } else if (!databaseReady) {
    message = databaseMessage;
  }

  return NextResponse.json({
    ready,
    liveKitReady,
    databaseReady,
    message,
  });
}
