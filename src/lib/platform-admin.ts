import type { SupabaseClient } from "@supabase/supabase-js";

function getOwnerUsernames(): Set<string> {
  const raw = process.env.ZUMELIA_OWNER_USERNAME ?? "femisaint";
  return new Set(
    raw
      .split(",")
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean),
  );
}

function getOwnerEmails(): Set<string> {
  const raw =
    process.env.ZUMELIA_OWNER_EMAIL ?? "olaniranfemi01@gmail.com";
  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** Optional UUID override. */
function getOwnerUserId(): string | null {
  const id = process.env.ZUMELIA_OWNER_USER_ID?.trim();
  return id || null;
}

export function getPlatformOwnerUsernames(): string[] {
  return [...getOwnerUsernames()];
}

export async function isPlatformAdmin(
  supabase: SupabaseClient,
  userId: string,
  email?: string | null,
): Promise<boolean> {
  const ownerId = getOwnerUserId();
  if (ownerId && userId === ownerId) return true;

  if (email && getOwnerEmails().has(email.toLowerCase())) return true;

  const { data: adminRow, error: adminError } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!adminError && adminRow) return true;

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.username && getOwnerUsernames().has(profile.username.toLowerCase())) {
    return true;
  }

  return false;
}
