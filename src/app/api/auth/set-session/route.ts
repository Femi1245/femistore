import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";

/**
 * Persist a client-established Supabase session into HTTP cookies so
 * server components / middleware can see the user (needed in Capacitor WebView).
 */
export async function POST(request: Request) {
  let body: { access_token?: string; refresh_token?: string };
  try {
    body = (await request.json()) as {
      access_token?: string;
      refresh_token?: string;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const access_token = body.access_token?.trim();
  const refresh_token = body.refresh_token?.trim();
  if (!access_token || !refresh_token) {
    return NextResponse.json(
      { error: "Missing access_token or refresh_token" },
      { status: 400 },
    );
  }

  const pending = NextResponse.json({ ok: true });
  try {
    const { supabase, applied } = await createRouteHandlerClient(pending);
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (error || !data.session) {
      return NextResponse.json(
        { error: error?.message ?? "Could not set session" },
        { status: 400 },
      );
    }

    const response = NextResponse.json({ ok: true });
    applied.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
    return response;
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Auth service unavailable",
      },
      { status: 500 },
    );
  }
}
