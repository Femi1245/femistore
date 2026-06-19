import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { AccountKind, AccountMode, Profile } from "./types";

export type ProfileResult = {
  profile: Profile | null;
  error?: string;
};

export function normalizeProfile(row: Record<string, unknown>): Profile {
  const p = row as Profile;
  return {
    ...p,
    account_kind: (p.account_kind ?? "personal") as AccountKind,
    business_enabled: p.business_enabled ?? false,
    active_mode: (p.active_mode ?? "personal") as AccountMode,
    business_name: p.business_name ?? null,
    business_category: p.business_category ?? null,
    business_tagline: p.business_tagline ?? null,
    business_description: p.business_description ?? null,
    business_website: p.business_website ?? null,
    business_email: p.business_email ?? null,
    business_phone: p.business_phone ?? null,
    business_location: p.business_location ?? null,
    business_cover_url: p.business_cover_url ?? null,
    business_services: p.business_services ?? null,
    business_contact_enabled: p.business_contact_enabled ?? true,
    business_auto_reply_enabled: p.business_auto_reply_enabled ?? false,
    business_auto_reply_message: p.business_auto_reply_message ?? "",
    business_featured: p.business_featured ?? false,
    business_featured_at: p.business_featured_at ?? null,
    last_seen_at: p.last_seen_at ?? null,
    is_private: p.is_private ?? false,
    dm_policy: (p.dm_policy ?? "friends") as Profile["dm_policy"],
    show_last_seen: p.show_last_seen ?? true,
    show_read_receipts: p.show_read_receipts ?? true,
    ai_assistant_enabled: p.ai_assistant_enabled ?? true,
    digest_mode: p.digest_mode ?? false,
    quiet_hours_start: p.quiet_hours_start ?? null,
    quiet_hours_end: p.quiet_hours_end ?? null,
    profile_theme: (p.profile_theme ?? "default") as Profile["profile_theme"],
    profile_accent_color: p.profile_accent_color ?? null,
  };
}

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

  if (existing) return { profile: normalizeProfile(existing as Record<string, unknown>) };

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

  const accountKind = (meta.account_kind as string) === "business" ? "business" : "personal";
  const isBusinessSignup = accountKind === "business";

  const { data: created, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        username,
        display_name: displayName,
        country: String(meta.country ?? "Global"),
        ...(meta.date_of_birth
          ? { date_of_birth: String(meta.date_of_birth).slice(0, 10) }
          : {}),
        account_kind: accountKind,
        active_mode: isBusinessSignup ? "business" : "personal",
        business_enabled: isBusinessSignup,
        ...(isBusinessSignup && meta.business_name
          ? {
              business_name: String(meta.business_name),
              business_category: String(meta.business_category ?? "Other"),
              business_tagline: String(meta.business_tagline ?? ""),
            }
          : {}),
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

  return { profile: normalizeProfile(created as Record<string, unknown>) };
}
