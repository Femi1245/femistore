import { NextResponse } from "next/server";
import { requireAdminApiFromRequest } from "@/lib/admin-api";

export async function GET(request: Request) {
  const auth = await requireAdminApiFromRequest(request);
  if ("error" in auth && auth.error) return auth.error;

  const { data, error } = await auth.adminClient
    .from("profiles")
    .select("id, username, display_name, avatar_url, verified_category, verified_at, country")
    .eq("is_verified", true)
    .order("verified_at", { ascending: false, nullsFirst: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data ?? [] });
}
