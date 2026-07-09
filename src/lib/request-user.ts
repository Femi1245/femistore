import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { createClient as createCookieClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/route-handler";

function bearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  return token || null;
}

/** Supabase client for the current request (cookies on web, Bearer on mobile). */
export async function getSupabaseForRequest(
  request: Request,
): Promise<SupabaseClient> {
  const token = bearerToken(request);
  if (token) {
    const { url, key } = getSupabaseEnv();
    return createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
  }
  return createCookieClient();
}

/** Resolve the signed-in user from cookies (web) or Bearer token (mobile). */
export async function getUserFromRequest(
  request: Request,
): Promise<User | null> {
  const supabase = await getSupabaseForRequest(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
