/** Normalize user input to E.164 for Supabase Auth (+country + number, max 15 digits). */
export function formatPhoneE164(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let digits = trimmed.replace(/[^\d+]/g, "");

  // Local NG mobile: 08012345678 → +2348012345678
  if (digits.startsWith("0") && digits.length >= 10) {
    digits = `+234${digits.slice(1)}`;
  } else if (digits.startsWith("234") && !digits.startsWith("+")) {
    digits = `+${digits}`;
  } else if (!digits.startsWith("+")) {
    digits = `+${digits.replace(/^\+/, "")}`;
  }

  const numeric = digits.slice(1).replace(/\D/g, "");
  if (numeric.length < 8 || numeric.length > 15) return null;
  if (!/^[1-9]\d{7,14}$/.test(numeric)) return null;

  return `+${numeric}`;
}

export function phoneFormatHint(): string {
  return "Use international format with country code, e.g. +2348012345678 (not 080…).";
}
