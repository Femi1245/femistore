import { NextResponse } from "next/server";
import { requireAdminApiFromRequest } from "@/lib/admin-api";

export async function POST(request: Request) {
  const auth = await requireAdminApiFromRequest(request);
  if ("error" in auth && auth.error) return auth.error;

  const body = await request.json().catch(() => ({}));
  const requestId = body.requestId as string | undefined;
  const adminNote = typeof body.adminNote === "string" ? body.adminNote.trim() : "";

  if (!requestId) {
    return NextResponse.json({ error: "requestId is required" }, { status: 400 });
  }

  const { data: row, error: fetchError } = await auth.adminClient
    .from("verification_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (fetchError || !row) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (row.status !== "pending") {
    return NextResponse.json({ error: "Request already reviewed" }, { status: 400 });
  }

  const now = new Date().toISOString();

  const { error: profileError } = await auth.adminClient
    .from("profiles")
    .update({
      is_verified: true,
      verified_at: now,
      verified_category: row.category,
      verified_by: auth.user.id,
    })
    .eq("id", row.user_id);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const { error: updateError } = await auth.adminClient
    .from("verification_requests")
    .update({
      status: "approved",
      reviewed_by: auth.user.id,
      reviewed_at: now,
      admin_note: adminNote || null,
      updated_at: now,
    })
    .eq("id", requestId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
