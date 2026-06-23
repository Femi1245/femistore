import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatPayment } from "./types";

export type SendChatPaymentInput = {
  conversationId: string;
  recipientId: string;
  amountCents: number;
  currency?: string;
  note?: string;
};

export function formatPaymentAmount(cents: number, currency: string): string {
  const value = cents / 100;
  const symbol = currency === "NGN" ? "₦" : currency === "USD" ? "$" : `${currency} `;
  const formatted =
    currency === "NGN"
      ? value.toLocaleString(undefined, { maximumFractionDigits: 0 })
      : value.toFixed(cents % 100 === 0 ? 0 : 2);
  return `${symbol}${formatted}`;
}

export async function createChatPayment(
  supabase: SupabaseClient,
  senderId: string,
  input: SendChatPaymentInput,
  payment: { status: "mock" | "pending"; provider?: string | null },
): Promise<{ payment: ChatPayment | null; error?: string }> {
  if (senderId === input.recipientId) {
    return { payment: null, error: "You cannot pay yourself." };
  }
  if (input.amountCents < 100) {
    return { payment: null, error: "Minimum amount is 1.00 (100 cents)." };
  }

  const { data, error } = await supabase
    .from("chat_payments")
    .insert({
      conversation_id: input.conversationId,
      sender_id: senderId,
      recipient_id: input.recipientId,
      amount_cents: input.amountCents,
      currency: input.currency ?? "USD",
      note: (input.note ?? "").trim().slice(0, 200),
      payment_status: payment.status,
      payment_provider: payment.provider ?? null,
    })
    .select("*")
    .single();

  if (error?.code === "PGRST205") {
    return {
      payment: null,
      error: "Run supabase/voice-close-friends-payments-schema.sql in Supabase first.",
    };
  }
  if (error) return { payment: null, error: error.message };
  return { payment: data as ChatPayment };
}

export async function fulfillChatPayment(
  supabase: SupabaseClient,
  payment: ChatPayment,
): Promise<void> {
  const label = formatPaymentAmount(payment.amount_cents, payment.currency);
  const note = payment.note?.trim();
  const content = note
    ? `Sent ${label} — ${note}`
    : `Sent ${label}`;

  const { data: message } = await supabase
    .from("messages")
    .insert({
      conversation_id: payment.conversation_id,
      sender_id: payment.sender_id,
      content,
      message_type: "payment",
      chat_payment_id: payment.id,
    })
    .select("id")
    .single();

  if (message?.id) {
    await supabase
      .from("chat_payments")
      .update({ message_id: message.id })
      .eq("id", payment.id);
  }

  await supabase.from("notifications").insert({
    recipient_id: payment.recipient_id,
    actor_id: payment.sender_id,
    type: "message",
    entity_type: "chat",
    entity_id: payment.conversation_id,
    message: `${content} in chat`,
  });
}

export async function markChatPaymentPaidAndFulfill(
  supabase: SupabaseClient,
  paymentId: string,
  providerReference: string,
): Promise<void> {
  const { data: payment } = await supabase
    .from("chat_payments")
    .update({
      payment_status: "paid",
      payment_reference: providerReference,
    })
    .eq("id", paymentId)
    .eq("payment_status", "pending")
    .select("*")
    .maybeSingle();

  if (!payment) return;
  await fulfillChatPayment(supabase, payment as ChatPayment);
}

export async function sendChatPaymentDemo(
  supabase: SupabaseClient,
  senderId: string,
  input: SendChatPaymentInput,
): Promise<{ payment: ChatPayment | null; error?: string }> {
  const { payment, error } = await createChatPayment(supabase, senderId, input, {
    status: "mock",
  });
  if (error || !payment) return { payment: null, error };
  await fulfillChatPayment(supabase, payment);
  return { payment };
}
