import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  let user = null;
  let authCheckFailed = false;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    // Transient network error reaching Supabase. Don't bounce the user —
    // let the request through and let the page-level guard decide once
    // connectivity is restored. This prevents redirect loops / surprise logouts.
    authCheckFailed = true;
  }

  if (authCheckFailed) {
    return supabaseResponse;
  }

  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup");

  const isAuthCallback = request.nextUrl.pathname.startsWith("/auth/callback");

  const protectedPrefixes = [
    "/chat",
    "/feed",
    "/profile",
    "/live",
    "/watch",
    "/notifications",
  ];
  const isProtected = protectedPrefixes.some((p) =>
    request.nextUrl.pathname.startsWith(p),
  );

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage && !isAuthCallback) {
    const url = request.nextUrl.clone();
    url.pathname = "/chat";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
