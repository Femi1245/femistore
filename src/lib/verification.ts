import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile, VerificationCategory, VerificationRequest } from "@/lib/types";

export const VERIFICATION_CATEGORIES: {
  id: VerificationCategory;
  label: string;
  description: string;
}[] = [
  {
    id: "celebrity",
    label: "Celebrity",
    description: "Actors, musicians, athletes, influencers with large audiences",
  },
  {
    id: "public_figure",
    label: "Public figure",
    description: "Journalists, politicians, activists, well-known professionals",
  },
  {
    id: "official",
    label: "Official account",
    description: "Brands, organizations, government, or team accounts",
  },
  {
    id: "notable",
    label: "Notable",
    description: "Other authentic accounts that need a verified badge",
  },
];

export function verificationCategoryLabel(category: VerificationCategory | null | undefined): string {
  return VERIFICATION_CATEGORIES.find((c) => c.id === category)?.label ?? "Verified";
}

export type VerificationRequestRow = VerificationRequest & {
  profile?: Pick<Profile, "id" | "username" | "display_name" | "avatar_url" | "is_verified">;
};

export async function loadMyVerificationRequest(
  supabase: SupabaseClient,
  userId: string,
): Promise<VerificationRequest | null> {
  const { data, error } = await supabase
    .from("verification_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error?.message?.includes("verification_requests")) return null;
  return (data as VerificationRequest) ?? null;
}

export function parsePublicLinks(input: string): string[] {
  return input
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && (s.startsWith("http://") || s.startsWith("https://")))
    .slice(0, 8);
}
