import { NextResponse } from "next/server";
import { sendWelcomeEmailIfNeeded } from "@/lib/email-notifications";
import { isEmailConfigured } from "@/lib/email";
import { ensureProfile } from "@/lib/auth";
import { getUserFromRequest, getSupabaseForRequest } from "@/lib/request-user";
import type { AccountKind } from "@/lib/types";

export const runtime = "nodejs";

/** Idempotent welcome email — safe to call after signup or OAuth (web or mobile). */
export async function POST(request: Request) {
  if (!isEmailConfigured()) {
    return NextResponse.json({ ok: false, sent: false, message: "Email not configured" });
  }

  const user = await getUserFromRequest(request);
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await getSupabaseForRequest(request);
  const { profile } = await ensureProfile(supabase, user);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const accountKind = (profile.account_kind ?? "personal") as AccountKind;
  const result = await sendWelcomeEmailIfNeeded({
    userId: user.id,
    displayName: profile.display_name,
    email: user.email,
    accountKind: accountKind === "business" ? "business" : "personal",
  });

  return NextResponse.json({ ok: true, ...result });
}
