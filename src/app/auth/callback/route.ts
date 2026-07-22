import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/app-url";
import { formatOAuthError } from "@/lib/oauth-providers";

function loginErrorRedirect(origin: string, message: string, next: string) {
  const params = new URLSearchParams({
    error: formatOAuthError(message),
  });
  if (next !== "/feed" && next !== "/chat") {
    params.set("next", next);
  }
  return `${origin}/login?${params.toString()}`;
}

/**
 * Legacy OAuth callback. Forwards the auth code to the client finish page so
 * PKCE exchange + cookie sync work reliably in Capacitor WebViews.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = safeNextPath(searchParams.get("next"), "/feed");

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

  const finish = new URL(`${origin}/auth/finish`);
  finish.searchParams.set("code", code);
  if (next !== "/feed") finish.searchParams.set("next", next);
  return NextResponse.redirect(finish);
}
