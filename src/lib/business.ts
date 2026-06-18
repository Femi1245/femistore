import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountKind, AccountMode, Profile } from "./types";

export const BUSINESS_CATEGORIES = [
  "Technology",
  "Fashion & Beauty",
  "Food & Restaurant",
  "Health & Wellness",
  "Education",
  "Creative & Design",
  "Music & Entertainment",
  "Retail & E-commerce",
  "Real Estate",
  "Professional Services",
  "Fitness & Sports",
  "Travel & Hospitality",
  "Other",
] as const;

export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number];

export function hasBusinessProfile(profile: Profile): boolean {
  return (
    profile.account_kind === "business" ||
    (profile.business_enabled && !!profile.business_name?.trim())
  );
}

export function acceptsBusinessContact(profile: Profile): boolean {
  return (
    hasBusinessProfile(profile) &&
    (profile.business_contact_enabled ?? true)
  );
}

export function canSwitchAccountMode(profile: Profile): boolean {
  return profile.account_kind === "personal" && profile.business_enabled;
}

export function getActiveMode(profile: Profile): AccountMode {
  if (profile.account_kind === "business") return "business";
  if (profile.business_enabled && profile.active_mode === "business") return "business";
  return "personal";
}

export function getPublicDisplayName(profile: Profile): string {
  if (profile.account_kind === "business" && profile.business_name) {
    return profile.business_name;
  }
  if (profile.business_enabled && profile.business_name && profile.active_mode === "business") {
    return profile.business_name;
  }
  return profile.display_name;
}

export function getPostingLabel(profile: Profile): string {
  const mode = getActiveMode(profile);
  if (mode === "business" && profile.business_name) {
    return profile.business_name;
  }
  return profile.display_name;
}

export async function switchAccountMode(
  supabase: SupabaseClient,
  userId: string,
  mode: AccountMode,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("profiles")
    .update({ active_mode: mode })
    .eq("id", userId)
    .eq("business_enabled", true);

  if (error) return { error: error.message };
  return {};
}

export type BusinessProfileInput = {
  business_name: string;
  business_category: string;
  business_tagline?: string;
  business_description?: string;
  business_website?: string;
  business_email?: string;
  business_phone?: string;
  business_location?: string;
  business_services?: string;
  business_cover_url?: string | null;
  business_contact_enabled?: boolean;
  business_auto_reply_enabled?: boolean;
  business_auto_reply_message?: string;
};

export async function setupBusinessProfile(
  supabase: SupabaseClient,
  userId: string,
  input: BusinessProfileInput,
  options: { fromSignup?: boolean } = {},
): Promise<{ error?: string }> {
  const name = input.business_name.trim();
  if (!name) return { error: "Business name is required." };
  if (!input.business_category.trim()) return { error: "Choose a category." };

  const payload = {
    business_name: name,
    business_category: input.business_category.trim(),
    business_tagline: (input.business_tagline ?? "").trim(),
    business_description: (input.business_description ?? "").trim(),
    business_website: (input.business_website ?? "").trim(),
    business_email: (input.business_email ?? "").trim(),
    business_phone: (input.business_phone ?? "").trim(),
    business_location: (input.business_location ?? "").trim(),
    business_services: (input.business_services ?? "").trim(),
    business_cover_url: input.business_cover_url ?? null,
    business_enabled: true,
    active_mode: "business" as AccountMode,
    business_contact_enabled: input.business_contact_enabled ?? true,
    business_auto_reply_enabled: input.business_auto_reply_enabled ?? false,
    business_auto_reply_message: (input.business_auto_reply_message ?? "").trim(),
    ...(options.fromSignup ? { account_kind: "business" as AccountKind } : {}),
  };

  const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
  if (error) return { error: error.message };
  return {};
}

export async function updateBusinessProfile(
  supabase: SupabaseClient,
  userId: string,
  input: BusinessProfileInput,
): Promise<{ error?: string }> {
  return setupBusinessProfile(supabase, userId, input);
}

export type BusinessDiscoveryFilters = {
  search?: string;
  category?: string;
  location?: string;
  limit?: number;
};

export async function loadDiscoverableBusinesses(
  supabase: SupabaseClient,
  filters: BusinessDiscoveryFilters = {},
): Promise<Profile[]> {
  const limit = filters.limit ?? 48;
  let query = supabase
    .from("profiles")
    .select("*")
    .or("account_kind.eq.business,business_enabled.eq.true")
    .not("business_name", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filters.category?.trim()) {
    query = query.eq("business_category", filters.category.trim());
  }

  if (filters.location?.trim()) {
    query = query.ilike("business_location", `%${filters.location.trim()}%`);
  }

  if (filters.search?.trim()) {
    const term = filters.search.trim();
    query = query.or(
      `business_name.ilike.%${term}%,business_tagline.ilike.%${term}%,business_description.ilike.%${term}%,business_services.ilike.%${term}%,business_category.ilike.%${term}%`,
    );
  }

  const { data } = await query;
  return ((data as Profile[]) ?? []).filter(
    (p) => p.business_name?.trim() && hasBusinessProfile(p),
  );
}

export async function loadFeaturedBusinesses(
  supabase: SupabaseClient,
  limit = 8,
): Promise<Profile[]> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("business_featured", true)
    .not("business_name", "is", null)
    .order("business_featured_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  return ((data as Profile[]) ?? []).filter(
    (p) => p.business_name?.trim() && hasBusinessProfile(p),
  );
}
