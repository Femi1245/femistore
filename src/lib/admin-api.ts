import { NextResponse } from "next/server";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuthenticatedClient } from "@/lib/supabase/route-auth";

export async function requireAdminApiFromRequest(request: Request) {
  const { supabase, user } = await createAuthenticatedClient(request);

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const admin = await isPlatformAdmin(supabase, user.id, user.email);
  if (!admin) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  try {
    return { user, supabase, adminClient: createAdminClient() };
  } catch {
    return {
      error: NextResponse.json(
        {
          error:
            "Admin API not configured. Add SUPABASE_SERVICE_ROLE_KEY to Vercel environment variables.",
        },
        { status: 503 },
      ),
    };
  }
}

function schemaHint(message: string): string | null {
  if (
    message.includes("verification_requests") ||
    message.includes("is_verified") ||
    message.includes("platform_admins")
  ) {
    return " Run supabase/celebrity-verification-schema.sql in Supabase SQL Editor.";
  }
  return null;
}

export function adminDbError(message: string, status = 500) {
  const hint = schemaHint(message);
  return NextResponse.json({ error: message + (hint ?? "") }, { status });
}
