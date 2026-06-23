import { NextResponse } from "next/server";
import { areMutualFriends } from "@/lib/chat";
import {
  createChatPayment,
  sendChatPaymentDemo,
  type SendChatPaymentInput,
} from "@/lib/chat-payments";
import { initializeTransaction, isPaystackConfigured } from "@/lib/paystack";
import { createAuthenticatedClient } from "@/lib/supabase/route-auth";

export async function POST(request: Request) {
  const { supabase, user } = await createAuthenticatedClient(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const conversationId = body.conversationId as string | undefined;
  const recipientId = body.recipientId as string | undefined;
  const amountCents = Number(body.amountCents);
  const currency = (body.currency as string | undefined) ?? "USD";
  const note = body.note as string | undefined;

  if (!conversationId || !recipientId || !Number.isFinite(amountCents)) {
    return NextResponse.json(
      { error: "conversationId, recipientId, and amountCents are required" },
      { status: 400 },
    );
  }

  const { data: member } = await supabase
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: "Not in this conversation" }, { status: 403 });
  }

  const friends = await areMutualFriends(supabase, user.id, recipientId);
  if (!friends) {
    return NextResponse.json(
      { error: "You can only send money to mutual friends in chat." },
      { status: 403 },
    );
  }

  const input: SendChatPaymentInput = {
    conversationId,
    recipientId,
    amountCents: Math.round(amountCents),
    currency,
    note,
  };

  if (!isPaystackConfigured()) {
    const { payment, error } = await sendChatPaymentDemo(supabase, user.id, input);
    if (error || !payment) {
      return NextResponse.json({ error: error ?? "Payment failed" }, { status: 500 });
    }
    return NextResponse.json({
      payment,
      paymentNote: "Demo mode — no charge. Add PAYSTACK_SECRET_KEY for real payments.",
    });
  }

  const { payment, error } = await createChatPayment(supabase, user.id, input, {
    status: "pending",
    provider: "paystack",
  });

  if (error || !payment) {
    return NextResponse.json({ error: error ?? "Could not start payment" }, { status: 500 });
  }

  const email = user.email ?? `${user.id}@users.zumelia.app`;
  const origin = new URL(request.url).origin;

  try {
    const tx = await initializeTransaction({
      email,
      amountSubunit: payment.amount_cents,
      currency: payment.currency,
      reference: payment.id,
      callbackUrl: `${origin}/api/payments/chat-callback`,
      metadata: {
        chat_payment_id: payment.id,
        sender_id: user.id,
        recipient_id: recipientId,
        kind: "chat_payment",
      },
    });

    return NextResponse.json({
      authorization_url: tx.authorization_url,
      reference: payment.id,
    });
  } catch {
    await supabase
      .from("chat_payments")
      .update({ payment_status: "failed" })
      .eq("id", payment.id);
    return NextResponse.json({ error: "Could not start Paystack checkout." }, { status: 502 });
  }
}
