import type { SupabaseClient } from "@supabase/supabase-js";
import type { DmPolicy, Profile, ProfileTheme } from "./types";

export type PrivacySettings = {
  is_private: boolean;
  dm_policy: DmPolicy;
  show_last_seen: boolean;
  show_read_receipts: boolean;
  show_birthday: boolean;
  ai_assistant_enabled: boolean;
  digest_mode: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  profile_theme: ProfileTheme;
  profile_accent_color: string | null;
};

export const DM_POLICY_LABELS: Record<DmPolicy, string> = {
  everyone: "Everyone (message requests for strangers)",
  friends: "Friends only (mutual connect)",
  business_only: "Business inquiries only",
  nobody: "Nobody",
};

export const PROFILE_THEMES: { id: ProfileTheme; label: string; accent: string }[] = [
  { id: "default", label: "Classic", accent: "#c45c26" },
  { id: "rust", label: "Rust", accent: "#a84820" },
  { id: "olive", label: "Olive", accent: "#6b7c3e" },
  { id: "midnight", label: "Midnight", accent: "#2c3440" },
  { id: "paper", label: "Paper", accent: "#8b7355" },
];

export function privacyFromProfile(profile: Profile): PrivacySettings {
  return {
    is_private: profile.is_private ?? false,
    dm_policy: profile.dm_policy ?? "friends",
    show_last_seen: profile.show_last_seen ?? true,
    show_read_receipts: profile.show_read_receipts ?? true,
    show_birthday: profile.show_birthday ?? true,
    ai_assistant_enabled: profile.ai_assistant_enabled ?? true,
    digest_mode: profile.digest_mode ?? false,
    quiet_hours_start: profile.quiet_hours_start ?? null,
    quiet_hours_end: profile.quiet_hours_end ?? null,
    profile_theme: profile.profile_theme ?? "default",
    profile_accent_color: profile.profile_accent_color ?? null,
  };
}

export async function updatePrivacySettings(
  supabase: SupabaseClient,
  userId: string,
  settings: Partial<PrivacySettings>,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("profiles")
    .update(settings)
    .eq("id", userId);

  if (error) return { error: error.message };
  return {};
}

export async function canViewPrivateProfile(
  supabase: SupabaseClient,
  viewerId: string,
  profile: Profile,
): Promise<boolean> {
  if (profile.id === viewerId) return true;
  if (!profile.is_private) return true;

  const { data } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", viewerId)
    .eq("following_id", profile.id)
    .maybeSingle();

  return !!data;
}

export function profileThemeStyle(
  theme: ProfileTheme,
  accent?: string | null,
): Record<string, string> {
  const preset = PROFILE_THEMES.find((t) => t.id === theme);
  const color = accent ?? preset?.accent ?? "#c45c26";
  return { "--profile-accent": color };
}
