import { NextResponse } from "next/server";
import { isEmailConfigured } from "@/lib/email";
import { runDailyBirthdayEmails } from "@/lib/email-notifications";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Daily birthday emails. Vercel Cron calls this route once per day.
 * Set CRON_SECRET in Vercel env — Vercel sends Authorization: Bearer <CRON_SECRET>.
 * Manual test: GET /api/cron/birthday-emails with the same header.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!isEmailConfigured()) {
    return NextResponse.json({
      ok: false,
      message: "Email not configured. Set RESEND_API_KEY and EMAIL_FROM.",
    });
  }

  try {
    const admin = createAdminClient();
    const result = await runDailyBirthdayEmails(admin);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
