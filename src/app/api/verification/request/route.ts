import { NextResponse } from "next/server";
import { createAuthenticatedClient } from "@/lib/supabase/route-auth";
import { parsePublicLinks } from "@/lib/verification";
import type { VerificationCategory } from "@/lib/types";

export async function POST(request: Request) {
  const { supabase, user } = await createAuthenticatedClient(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const category = body.category as VerificationCategory | undefined;
  const applicantNote = typeof body.applicantNote === "string" ? body.applicantNote.trim() : "";
  const publicLinks = parsePublicLinks(
    typeof body.publicLinks === "string" ? body.publicLinks : "",
  );

  const validCategories = ["public_figure", "celebrity", "official", "notable"];
  if (!category || !validCategories.includes(category)) {
    return NextResponse.json({ error: "Choose a verification category" }, { status: 400 });
  }

  if (publicLinks.length === 0) {
    return NextResponse.json(
      { error: "Add at least one public profile link (https://…)" },
      { status: 400 },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_verified")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_verified) {
    return NextResponse.json({ error: "Your account is already verified" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("verification_requests")
    .insert({
      user_id: user.id,
      category,
      public_links: publicLinks,
      applicant_note: applicantNote.slice(0, 2000),
    })
    .select()
    .single();

  if (error) {
    if (error.message.includes("verification_requests_one_pending")) {
      return NextResponse.json(
        { error: "You already have a pending verification request" },
        { status: 400 },
      );
    }
    if (error.message.includes("verification_requests")) {
      return NextResponse.json(
        { error: "Verification not set up. Run supabase/celebrity-verification-schema.sql" },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ request: data });
}

export async function GET(request: Request) {
  const { supabase, user } = await createAuthenticatedClient(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("verification_requests")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error?.message?.includes("verification_requests")) {
    return NextResponse.json({ request: null });
  }

  return NextResponse.json({ request: data });
}
