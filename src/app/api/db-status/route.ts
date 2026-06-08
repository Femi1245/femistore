import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json({
      ready: false,
      message: "Missing .env.local — copy .env.local.example and add your Supabase URL and anon key.",
    });
  }

  const supabase = await createClient();
  const { error: profileError } = await supabase.from("profiles").select("id").limit(1);
  const { error: postsError } = await supabase.from("posts").select("id").limit(1);

  if (profileError?.code === "PGRST205") {
    return NextResponse.json({
      ready: false,
      message:
        "Database tables are missing. Open Supabase → SQL Editor, paste and run supabase/schema.sql, then refresh this page.",
    });
  }

  if (postsError?.code === "PGRST205") {
    return NextResponse.json({
      ready: false,
      message:
        "Social tables are missing. Run supabase/social-schema.sql in Supabase SQL Editor, then refresh.",
    });
  }

  if (profileError || postsError) {
    return NextResponse.json({
      ready: false,
      message: profileError?.message ?? postsError?.message,
    });
  }

  return NextResponse.json({ ready: true });
}
