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

  const now = new Date().toISOString();

  const { error } = await auth.adminClient
    .from("verification_requests")
    .update({
      status: "rejected",
      reviewed_by: auth.user.id,
      reviewed_at: now,
      admin_note: adminNote || null,
      updated_at: now,
    })
    .eq("id", requestId)
    .eq("status", "pending");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
