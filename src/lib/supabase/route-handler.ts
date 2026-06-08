import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase environment variables.");
  }

  return { url, key };
}

/** Supabase client for route handlers that must persist auth cookies on redirects. */
export async function createRouteHandlerClient(response: NextResponse) {
  const { url, key } = getSupabaseEnv();
  const cookieStore = await cookies();
  const applied: CookieToSet[] = [];

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach((cookie) => {
          applied.push(cookie);
          cookieStore.set(cookie.name, cookie.value, cookie.options);
          response.cookies.set(cookie.name, cookie.value, cookie.options);
        });
      },
    },
  });

  return { supabase, applied };
}

export function redirectWithCookies(
  destination: string,
  cookiesToApply: CookieToSet[],
) {
  const response = NextResponse.redirect(destination);
  cookiesToApply.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
  return response;
}
