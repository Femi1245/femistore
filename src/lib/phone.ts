import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "./types";

export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let digits = trimmed.replace(/[^\d+]/g, "");
  if (!digits.startsWith("+")) {
    digits = `+${digits.replace(/^\+/, "")}`;
  }

  const numCount = digits.replace(/\D/g, "").length;
  if (numCount < 8) return null;

  return digits;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return phone;
  return `•••• ${digits.slice(-4)}`;
}

export async function sendPhoneVerificationOtp(
  supabase: SupabaseClient,
  phone: string,
): Promise<{ error?: string }> {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    return { error: "Enter a valid phone number with country code (e.g. +2348012345678)." };
  }

  const { error } = await supabase.auth.updateUser({ phone: normalized });
  if (error) {
    if (error.message.toLowerCase().includes("phone")) {
      return {
        error:
          "Phone sign-in is not enabled. In Supabase: Authentication → Providers → Phone.",
      };
    }
    return { error: error.message };
  }

  return {};
}

export async function verifyPhoneOtp(
  supabase: SupabaseClient,
  phone: string,
  token: string,
): Promise<{ error?: string }> {
  const normalized = normalizePhone(phone);
  if (!normalized) return { error: "Invalid phone number." };

  const { error } = await supabase.auth.verifyOtp({
    phone: normalized,
    token: token.trim(),
    type: "phone_change",
  });

  if (error) return { error: error.message };

  const { error: syncError } = await supabase.rpc("sync_my_verified_phone");
  if (syncError) return { error: syncError.message };

  return {};
}

export async function findUserByPhone(
  supabase: SupabaseClient,
  phone: string,
): Promise<{ user: Profile | null; error?: string }> {
  const { data, error } = await supabase.rpc("find_user_by_phone", {
    search_phone: phone,
  });

  if (error) {
    if (error.message.includes("Verify your phone")) {
      return { user: null, error: "Verify your phone number first to find contacts." };
    }
    return { user: null, error: error.message };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { user: null };

  return {
    user: {
      id: row.id,
      username: row.username,
      display_name: row.display_name,
      country: row.country,
      avatar_url: row.avatar_url,
      bio: "",
      date_of_birth: null,
      phone_e164: null,
      phone_verified_at: row.phone_verified_at,
      last_seen_at: null,
      account_kind: "personal",
      business_enabled: false,
      active_mode: "personal",
      business_name: null,
      business_category: null,
      business_tagline: null,
      business_description: null,
      business_website: null,
      business_email: null,
      business_phone: null,
      business_location: null,
      business_cover_url: null,
      business_services: null,
      created_at: "",
    },
  };
}
