import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeProfile } from "@/lib/auth";
import { formatPhoneE164, phoneFormatHint } from "@/lib/format-phone-e164";
import type { Profile } from "@/lib/types";

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

function mapPhoneAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("e.164") || lower.includes("invalid phone")) {
    return `${message} ${phoneFormatHint()}`;
  }

  if (lower.includes("sms provider") || lower.includes("error sending sms")) {
    return `${message} In Supabase → Authentication → Providers → Phone, connect Twilio (Account SID, Auth Token, and a sender number or Messaging Service SID).`;
  }

  if (
    lower.includes("phone provider is not enabled") ||
    lower.includes("unsupported phone provider")
  ) {
    return "Phone provider is off in Supabase. Open Authentication → Providers → Phone and enable it.";
  }

  return message;
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
    return { error: mapPhoneAuthError(error.message) };
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
    user: normalizeProfile(row as Record<string, unknown>),
  };
}
