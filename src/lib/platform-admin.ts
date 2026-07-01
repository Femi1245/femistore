import type { SupabaseClient } from "@supabase/supabase-js";

/** Comma-separated profile UUIDs in ZUMELIA_ADMIN_USER_IDS (optional fallback). */
export function getEnvAdminUserIds(): Set<string> {
  const raw = process.env.ZUMELIA_ADMIN_USER_IDS ?? "";
  return new Set(
    raw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

export async function isPlatformAdmin(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  if (getEnvAdminUserIds().has(userId)) return true;

  const { data, error } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error?.message?.includes("platform_admins")) {
    return getEnvAdminUserIds().has(userId);
  }

  return !!data;
}
