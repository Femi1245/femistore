import { NextResponse } from "next/server";
import { requireAdminApiFromRequest } from "@/lib/admin-api";
import type { VerificationCategory } from "@/lib/types";

export async function GET(request: Request) {
  const auth = await requireAdminApiFromRequest(request);
  if ("error" in auth && auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "pending";

  const { data, error } = await auth.adminClient
    .from("verification_requests")
    .select(
      `
      *,
      profiles (
        id,
        username,
        display_name,
        avatar_url,
        is_verified
      )
    `,
    )
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ requests: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAdminApiFromRequest(request);
  if ("error" in auth && auth.error) return auth.error;

  const body = await request.json().catch(() => ({}));
  const userId = body.userId as string | undefined;
  const category = body.category as VerificationCategory | undefined;
  const adminNote = typeof body.adminNote === "string" ? body.adminNote.trim() : "";

  if (!userId || !category) {
    return NextResponse.json({ error: "userId and category are required" }, { status: 400 });
  }

  const validCategories = ["public_figure", "celebrity", "official", "notable"];
  if (!validCategories.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const now = new Date().toISOString();

  const { error: profileError } = await auth.adminClient
    .from("profiles")
    .update({
      is_verified: true,
      verified_at: now,
      verified_category: category,
      verified_by: auth.user.id,
    })
    .eq("id", userId);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  await auth.adminClient
    .from("verification_requests")
    .update({
      status: "approved",
      reviewed_by: auth.user.id,
      reviewed_at: now,
      admin_note: adminNote || "Granted directly by admin",
      updated_at: now,
    })
    .eq("user_id", userId)
    .eq("status", "pending");

  return NextResponse.json({ ok: true });
}
