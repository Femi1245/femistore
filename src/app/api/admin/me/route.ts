import { NextResponse } from "next/server";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { createAuthenticatedClient } from "@/lib/supabase/route-auth";

export async function GET(request: Request) {
  const { supabase, user } = await createAuthenticatedClient(request);
  if (!user) {
    return NextResponse.json({ isAdmin: false });
  }

  const admin = await isPlatformAdmin(supabase, user.id, user.email);
  return NextResponse.json({ isAdmin: admin });
}
