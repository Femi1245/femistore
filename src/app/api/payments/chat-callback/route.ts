import { NextResponse } from "next/server";
import { markChatPaymentPaidAndFulfill } from "@/lib/chat-payments";
import { verifyTransaction } from "@/lib/paystack";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference");
  const result = (status: string) =>
    NextResponse.redirect(`${url.origin}/chat?payment=${status}`);

  if (!reference) return result("error");

  const tx = await verifyTransaction(reference);
  if (tx?.status === "success") {
    const admin = createAdminClient();
    await markChatPaymentPaidAndFulfill(admin, reference, tx.reference);
    return result("success");
  }

  return result("failed");
}
