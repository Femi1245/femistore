import { NextResponse } from "next/server";
import { ensureProfile } from "@/lib/auth";
import {
  createRouteHandlerClient,
  redirectWithCookies,
} from "@/lib/supabase/route-handler";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const providerError =
    searchParams.get("error_description") ?? searchParams.get("error");
  if (providerError) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(providerError)}`,
    );
  }

  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/chat";

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Missing sign-in code")}`,
    );
  }

  const successRedirect = `${origin}${next.startsWith("/") ? next : "/chat"}`;
  const pending = NextResponse.redirect(successRedirect);

  try {
    const { supabase, applied } = await createRouteHandlerClient(pending);
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error?.message ?? "Could not sign in")}`,
      );
    }

    const { profile, error: profileError } = await ensureProfile(
      supabase,
      data.user,
    );

    if (!profile) {
      return redirectWithCookies(
        `${origin}/login?error=${encodeURIComponent(profileError ?? "Could not create profile")}`,
        applied,
      );
    }

    return pending;
  } catch {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Authentication service is not configured")}`,
    );
  }
}
