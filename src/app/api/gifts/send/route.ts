import { NextResponse } from "next/server";
import { areMutualFriends } from "@/lib/chat";
import { sendGiftDemo, type SendGiftInput } from "@/lib/gifts";
import { createAuthenticatedClient } from "@/lib/supabase/route-auth";

export async function POST(request: Request) {
  const { supabase, user } = await createAuthenticatedClient(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const catalogId = body.catalogId as string | undefined;
  const recipientId = body.recipientId as string | undefined;
  const context = body.context as SendGiftInput["context"] | undefined;
  const conversationId = body.conversationId as string | undefined;
  const roomName = body.roomName as string | undefined;
  const note = body.note as string | undefined;

  if (!catalogId || !recipientId || !context) {
    return NextResponse.json(
      { error: "catalogId, recipientId, and context are required" },
      { status: 400 },
    );
  }

  if (!["profile", "chat", "live"].includes(context)) {
    return NextResponse.json({ error: "Invalid context" }, { status: 400 });
  }

  if (context === "live") {
    if (!roomName) {
      return NextResponse.json({ error: "roomName required for live gifts" }, { status: 400 });
    }
    const { data: stream } = await supabase
      .from("live_streams")
      .select("host_id, is_live")
      .eq("room_name", roomName)
      .maybeSingle();
    if (!stream?.is_live) {
      return NextResponse.json({ error: "Stream is not live" }, { status: 400 });
    }
    if (stream.host_id !== recipientId) {
      return NextResponse.json({ error: "Recipient must be the stream host" }, { status: 400 });
    }
  }

  if (context === "profile" || context === "chat") {
    const friends = await areMutualFriends(supabase, user.id, recipientId);
    if (!friends) {
      return NextResponse.json(
        { error: "You can only send gifts to mutual friends (both connected)." },
        { status: 403 },
      );
    }
    if (context === "chat" && conversationId) {
      const { data: member } = await supabase
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!member) {
        return NextResponse.json({ error: "Not in this conversation" }, { status: 403 });
      }
    }
  }

  const { gift, error } = await sendGiftDemo(supabase, user.id, {
    catalogId,
    recipientId,
    context,
    conversationId,
    roomName,
    note,
  });

  if (error || !gift) {
    return NextResponse.json({ error: error ?? "Failed to send gift" }, { status: 500 });
  }

  return NextResponse.json({
    gift,
    paymentNote:
      "Demo mode — no charge yet. Stripe / Paystack integration will be added soon.",
  });
}
