import { NextResponse } from "next/server";
import { markChatPaymentPaidAndFulfill } from "@/lib/chat-payments";
import { markGiftPaidAndFulfill } from "@/lib/gifts";
import { verifyWebhookSignature } from "@/lib/paystack";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Paystack webhook. Configure the URL in the Paystack dashboard:
 *   Settings → API Keys & Webhooks → Webhook URL
 *   https://<your-domain>/api/payments/webhook
 *
 * This is the source of truth for "did the money arrive". It must read the raw
 * body to verify the signature, so don't parse the request before verifying.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (event.event === "charge.success" && event.data?.reference) {
    const admin = createAdminClient();
    const ref = event.data.reference;
    const { data: gift } = await admin
      .from("sent_gifts")
      .select("id")
      .eq("id", ref)
      .maybeSingle();
    if (gift) {
      await markGiftPaidAndFulfill(admin, ref, ref);
    } else {
      await markChatPaymentPaidAndFulfill(admin, ref, ref);
    }
  }

  // Always 200 so Paystack stops retrying once we've received it.
  return NextResponse.json({ received: true });
}
