import { NextResponse } from "next/server";
import { isEmailConfigured } from "@/lib/email";
import { runReengagementEmails } from "@/lib/email-notifications";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Daily inactive-user reminders. Vercel Cron calls this route once per day.
 * Manual test: GET /api/cron/reengagement-emails with Authorization: Bearer <CRON_SECRET>
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
    const result = await runReengagementEmails(admin);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
