import { NextResponse } from "next/server";
import { requireAdminApiFromRequest } from "@/lib/admin-api";

export async function POST(request: Request) {
  const auth = await requireAdminApiFromRequest(request);
  if ("error" in auth && auth.error) return auth.error;

  const body = await request.json().catch(() => ({}));
  const userId = body.userId as string | undefined;

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const { error } = await auth.adminClient
    .from("profiles")
    .update({
      is_verified: false,
      verified_at: null,
      verified_category: null,
      verified_by: null,
    })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
