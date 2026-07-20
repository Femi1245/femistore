import { NextResponse } from "next/server";
import { getSupabaseForRequest, getUserFromRequest } from "@/lib/request-user";

export const runtime = "nodejs";

type RegisterBody = {
  token?: string;
  platform?: string;
  deviceId?: string;
};

function parsePlatform(value: string | undefined): "ios" | "android" | null {
  if (value === "ios" || value === "android") return value;
  return null;
}

/** Register or refresh an Expo push token for the signed-in user. */
export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: RegisterBody;
  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = body.token?.trim();
  const platform = parsePlatform(body.platform);
  if (!token || !platform) {
    return NextResponse.json(
      { error: "token and platform (ios|android) are required" },
      { status: 400 },
    );
  }

  const supabase = await getSupabaseForRequest(request);
  const { error } = await supabase.from("push_tokens").upsert(
    {
      user_id: user.id,
      token,
      platform,
      device_id: body.deviceId?.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "token" },
  );

  if (error) {
    if (error.code === "PGRST205") {
      return NextResponse.json(
        { error: "Push tokens table missing. Run supabase/push-tokens-schema.sql." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** Remove a push token (logout or disable notifications). */
export async function DELETE(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: RegisterBody;
  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = body.token?.trim();
  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  const supabase = await getSupabaseForRequest(request);
  const { error } = await supabase
    .from("push_tokens")
    .delete()
    .eq("user_id", user.id)
    .eq("token", token);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
