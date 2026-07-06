import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/app-url";
import { ensureProfile } from "@/lib/auth";
import { formatOAuthError } from "@/lib/oauth-providers";
import {
  createRouteHandlerClient,
  redirectWithCookies,
} from "@/lib/supabase/route-handler";

function loginErrorRedirect(origin: string, message: string, next: string) {
  const params = new URLSearchParams({
    error: formatOAuthError(message),
  });
  if (next !== "/chat") {
    params.set("next", next);
  }
  return `${origin}/login?${params.toString()}`;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = safeNextPath(searchParams.get("next"));

  const providerError =
    searchParams.get("error_description") ?? searchParams.get("error");
  if (providerError) {
    return NextResponse.redirect(
      loginErrorRedirect(origin, providerError, next),
    );
  }

  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      loginErrorRedirect(origin, "Missing sign-in code", next),
    );
  }

  const successRedirect = `${origin}${next}`;
  const pending = NextResponse.redirect(successRedirect);

  try {
    const { supabase, applied } = await createRouteHandlerClient(pending);
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      return NextResponse.redirect(
        loginErrorRedirect(
          origin,
          error?.message ?? "Could not sign in",
          next,
        ),
      );
    }

    const { profile, error: profileError } = await ensureProfile(
      supabase,
      data.user,
    );

    if (!profile) {
      return redirectWithCookies(
        loginErrorRedirect(
          origin,
          profileError ?? "Could not create profile",
          next,
        ),
        applied,
      );
    }

    const dest = profile.date_of_birth
      ? next
      : `/profile/birthday?next=${encodeURIComponent(next)}`;

    return redirectWithCookies(`${origin}${dest}`, applied);
  } catch {
    return NextResponse.redirect(
      loginErrorRedirect(
        origin,
        "Authentication service is not configured",
        next,
      ),
    );
  }
}
