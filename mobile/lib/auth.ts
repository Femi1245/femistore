import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Profile } from "./types";

export type ProfileResult = {
  profile: Profile | null;
  error?: string;
  isNewUser?: boolean;
};

function mapProfileError(message: string, code?: string): string {
  if (code === "PGRST205" || message.includes("profiles")) {
    return "Database not set up. In Supabase, open SQL Editor and run the full script in supabase/schema.sql.";
  }
  if (code === "23505" || message.includes("duplicate")) {
    return "That username is already taken. Choose a different username.";
  }
  if (message.includes("row-level security")) {
    return "Database permissions issue. Re-run supabase/schema.sql in Supabase SQL Editor.";
  }
  return message;
}

export async function ensureProfile(
  supabase: SupabaseClient,
  user: User,
): Promise<ProfileResult> {
  const { data: existing, error: readError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (readError) {
    return {
      profile: null,
      error: mapProfileError(readError.message, readError.code),
    };
  }

  if (existing) {
    return { profile: existing as Profile, isNewUser: false };
  }

  const meta = user.user_metadata ?? {};
  const emailPrefix = user.email?.split("@")[0] ?? `user_${user.id.slice(0, 8)}`;
  const baseUsername =
    String(meta.username ?? meta.user_name ?? meta.preferred_username ?? emailPrefix)
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 24) || `user_${user.id.slice(0, 8)}`;

  const displayName = String(
    meta.display_name ?? meta.full_name ?? meta.name ?? emailPrefix,
  );
  const avatarUrl =
    typeof meta.avatar_url === "string"
      ? meta.avatar_url
      : typeof meta.picture === "string"
        ? meta.picture
        : null;

  let username = baseUsername;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data: taken } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (!taken || taken.id === user.id) break;
    username = `${baseUsername.slice(0, 18)}_${user.id.slice(0, 4)}`;
    if (attempt > 0) {
      username = `${baseUsername.slice(0, 16)}_${Math.random().toString(36).slice(2, 6)}`;
    }
  }

  const { data: created, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        username,
        display_name: displayName,
        country: String(meta.country ?? "Global"),
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      },
      { onConflict: "id" },
    )
    .select()
    .single();

  if (error) {
    return {
      profile: null,
      error: mapProfileError(error.message, error.code),
    };
  }

  return { profile: created as Profile, isNewUser: true };
}
