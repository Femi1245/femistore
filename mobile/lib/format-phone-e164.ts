/** Normalize user input to E.164 for Supabase Auth (+country + number, max 15 digits). */
export function formatPhoneE164(
  input: string,
  dialCode?: string | null,
): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Keep a leading +, drop spaces/dashes/parens everywhere else.
  let digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.includes("+")) {
    digits = `+${digits.replace(/\+/g, "")}`;
  }

  if (!digits.startsWith("+")) {
    const dial = dialCode?.replace(/\D/g, "");
    if (dial) {
      // Local number for the selected country: drop leading zeros, prefix dial code.
      const local = digits.replace(/^0+/, "");
      digits = local.startsWith(dial) ? `+${local}` : `+${dial}${local}`;
    } else if (digits.startsWith("0") && digits.length >= 10) {
      // Legacy fallback when no country was selected (Nigerian local format).
      digits = `+234${digits.slice(1)}`;
    } else {
      digits = `+${digits}`;
    }
  }

  const numeric = digits.slice(1).replace(/\D/g, "");
  if (numeric.length < 8 || numeric.length > 15) return null;
  if (!/^[1-9]\d{7,14}$/.test(numeric)) return null;

  return `+${numeric}`;
}

export function phoneFormatHint(): string {
  return "Pick your country and enter your local number, or use international format like +14155550123.";
}
