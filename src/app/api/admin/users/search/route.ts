import { NextResponse } from "next/server";
import { requireAdminApiFromRequest } from "@/lib/admin-api";

export async function GET(request: Request) {
  const auth = await requireAdminApiFromRequest(request);
  if ("error" in auth && auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();

  if (q.length < 2) {
    return NextResponse.json({ users: [] });
  }

  const { data, error } = await auth.adminClient
    .from("profiles")
    .select("id, username, display_name, avatar_url, is_verified, verified_category, verified_at")
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .order("display_name")
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data ?? [] });
}
