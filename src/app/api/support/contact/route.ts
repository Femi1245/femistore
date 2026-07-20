import { NextResponse } from "next/server";
import { ensureProfile } from "@/lib/auth";
import { isEmailConfigured } from "@/lib/email";
import { getUserFromRequest, getSupabaseForRequest } from "@/lib/request-user";
import {
  sendSupportContactEmail,
  validateSupportContact,
  type SupportCategory,
  type SupportContactInput,
} from "@/lib/support";

export const runtime = "nodejs";

type Body = {
  name?: string;
  email?: string;
  category?: SupportCategory;
  subject?: string;
  message?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const user = await getUserFromRequest(request);
  const supabase = await getSupabaseForRequest(request);

  let profile: SupportContactInput["profile"] = null;
  if (user) {
    const { profile: loaded } = await ensureProfile(supabase, user);
    if (loaded) {
      profile = {
        id: loaded.id,
        username: loaded.username,
        display_name: loaded.display_name,
      };
    }
  }

  const input: SupportContactInput = {
    name: body.name ?? profile?.display_name ?? "",
    email: body.email ?? user?.email ?? "",
    category: body.category ?? "general",
    subject: body.subject ?? "",
    message: body.message ?? "",
    profile,
  };

  const validationError = validateSupportContact(input);
  if (validationError) {
    return NextResponse.json({ ok: false, error: validationError }, { status: 400 });
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Email is not configured.", emailNotConfigured: true },
      { status: 503 },
    );
  }

  const result = await sendSupportContactEmail(input);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? "Could not send message." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
