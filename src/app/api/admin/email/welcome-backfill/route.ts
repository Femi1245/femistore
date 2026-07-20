import { NextResponse } from "next/server";
import { isEmailConfigured } from "@/lib/email";
import { runWelcomeEmailBackfill } from "@/lib/email-notifications";
import { requireAdminApiFromRequest } from "@/lib/admin-api";

export const runtime = "nodejs";

/** Owner-only: send welcome emails to all users who never received one. */
export async function POST(request: Request) {
  const auth = await requireAdminApiFromRequest(request);
  if ("error" in auth && auth.error) return auth.error;

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Email not configured (RESEND_API_KEY, EMAIL_FROM)." },
      { status: 503 },
    );
  }

  const result = await runWelcomeEmailBackfill(auth.adminClient);
  return NextResponse.json({ ok: true, ...result });
}
