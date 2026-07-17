import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "./types";
import { formatPhoneE164, phoneFormatHint } from "./format-phone-e164";

export function normalizePhone(
  input: string,
  dialCode?: string | null,
): string | null {
  return formatPhoneE164(input, dialCode);
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return phone;
  return `•••• ${digits.slice(-4)}`;
}

export async function sendPhoneVerificationOtp(
  supabase: SupabaseClient,
  phone: string,
  dialCode?: string | null,
): Promise<{ error?: string }> {
  const normalized = normalizePhone(phone, dialCode);
  if (!normalized) {
    return { error: `Enter a valid phone number. ${phoneFormatHint()}` };
  }

  const { error } = await supabase.auth.updateUser({ phone: normalized });
  if (error) {
    const lower = error.message.toLowerCase();
    if (lower.includes("e.164") || lower.includes("invalid phone")) {
      return { error: `${error.message} ${phoneFormatHint()}` };
    }
    return { error: error.message };
  }

  return {};
}

export async function verifyPhoneOtp(
  supabase: SupabaseClient,
  phone: string,
  token: string,
  dialCode?: string | null,
): Promise<{ error?: string }> {
  const normalized = normalizePhone(phone, dialCode);
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
      created_at: "",
    },
  };
}
