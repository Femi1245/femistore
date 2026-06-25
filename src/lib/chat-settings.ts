import type { SupabaseClient } from "@supabase/supabase-js";
import type { DmPolicy, Profile } from "./types";
import { hasBusinessProfile } from "./business";

export type PersonalChatSettings = {
  personal_dm_policy: DmPolicy;
  show_last_seen: boolean;
  show_read_receipts: boolean;
};

export type BusinessChatSettings = {
  business_dm_policy: DmPolicy;
  business_contact_enabled: boolean;
  business_auto_reply_enabled: boolean;
  business_auto_reply_message: string;
};

export function personalChatSettingsFromProfile(profile: Profile): PersonalChatSettings {
  return {
    personal_dm_policy: profile.personal_dm_policy ?? profile.dm_policy ?? "friends",
    show_last_seen: profile.show_last_seen ?? true,
    show_read_receipts: profile.show_read_receipts ?? true,
  };
}

export function businessChatSettingsFromProfile(profile: Profile): BusinessChatSettings {
  return {
    business_dm_policy: profile.business_dm_policy ?? profile.dm_policy ?? "everyone",
    business_contact_enabled: profile.business_contact_enabled ?? true,
    business_auto_reply_enabled: profile.business_auto_reply_enabled ?? false,
    business_auto_reply_message: profile.business_auto_reply_message ?? "",
  };
}

export function getDmPolicyForInquiry(
  profile: Profile,
  asBusinessInquiry: boolean,
): DmPolicy {
  if (asBusinessInquiry && hasBusinessProfile(profile)) {
    return profile.business_dm_policy ?? profile.dm_policy ?? "everyone";
  }
  return profile.personal_dm_policy ?? profile.dm_policy ?? "friends";
}

export async function updatePersonalChatSettings(
  supabase: SupabaseClient,
  userId: string,
  settings: Partial<PersonalChatSettings>,
): Promise<{ error?: string }> {
  const patch: Record<string, unknown> = { ...settings };
  if (settings.personal_dm_policy) {
    patch.dm_policy = settings.personal_dm_policy;
  }
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) return { error: error.message };
  return {};
}

export async function updateBusinessChatSettings(
  supabase: SupabaseClient,
  userId: string,
  settings: Partial<BusinessChatSettings>,
): Promise<{ error?: string }> {
  const { error } = await supabase.from("profiles").update(settings).eq("id", userId);
  if (error) return { error: error.message };
  return {};
}
