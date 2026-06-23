import { NextResponse } from "next/server";
import { createAuthenticatedClient } from "@/lib/supabase/route-auth";

export async function POST(request: Request) {
  const { supabase, user } = await createAuthenticatedClient(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const roomName = String(body.roomName ?? "").trim();
  if (!roomName) {
    return NextResponse.json({ error: "roomName required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("voice_rooms")
    .update({ is_active: false, ended_at: new Date().toISOString() })
    .eq("room_name", roomName)
    .eq("host_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
