import { NextResponse } from "next/server";
import { markGiftPaidAndFulfill } from "@/lib/gifts";
import { verifyTransaction } from "@/lib/paystack";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Where Paystack redirects the user after checkout. We verify the transaction
 * server-side (don't trust the redirect alone), fulfil the gift if it succeeded,
 * then send the user to a friendly result page. The webhook is the primary
 * confirmation path; this is a fast fallback so the UI updates immediately.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference");
  const result = (status: string) =>
    NextResponse.redirect(`${url.origin}/gift/complete?status=${status}`);

  if (!reference) return result("error");

  const tx = await verifyTransaction(reference);
  if (tx?.status === "success") {
    const admin = createAdminClient();
    await markGiftPaidAndFulfill(admin, reference, tx.reference);
    return result("success");
  }

  return result("failed");
}
