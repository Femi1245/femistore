import { NextResponse } from "next/server";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuthenticatedClient } from "@/lib/supabase/route-auth";

export async function requireAdminApiFromRequest(request: Request) {
  const { supabase, user } = await createAuthenticatedClient(request);

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const admin = await isPlatformAdmin(supabase, user.id);
  if (!admin) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user, supabase, adminClient: createAdminClient() };
}
