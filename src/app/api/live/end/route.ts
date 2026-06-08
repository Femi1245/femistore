import { NextResponse } from "next/server";
import { createAuthenticatedClient } from "@/lib/supabase/route-auth";

export async function POST(request: Request) {
  const { supabase, user } = await createAuthenticatedClient(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomName } = await request.json();
  if (!roomName) {
    return NextResponse.json({ error: "roomName required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("live_streams")
    .update({ is_live: false, ended_at: new Date().toISOString() })
    .eq("room_name", roomName)
    .eq("host_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
