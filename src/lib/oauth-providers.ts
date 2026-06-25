/** Maps UI provider ids to Supabase Auth provider slugs. */
export type OAuthUiProvider = "google" | "github" | "twitter";

export type SupabaseOAuthProvider = "google" | "github" | "x";

export function toSupabaseOAuthProvider(provider: OAuthUiProvider): SupabaseOAuthProvider {
  return provider === "twitter" ? "x" : provider;
}

export function formatOAuthError(message: string): string {
  let text = message;
  try {
    const parsed = JSON.parse(message) as { msg?: string; error_code?: string };
    if (parsed.msg) text = parsed.msg;
  } catch {
    // plain string error
  }

  const lower = text.toLowerCase();

  if (lower.includes("invalid_client")) {
    return "X sign-in credentials are wrong in Supabase. Use the OAuth 2.0 Client ID and Client Secret from developer.x.com (Keys and tokens), not the legacy API Key / API Secret.";
  }

  if (
    lower.includes("redirect is requested") ||
    lower.includes("invalid_request") ||
    lower.includes("oauth state parameter")
  ) {
    return "X sign-in could not complete. In Supabase, enable “X / Twitter (OAuth 2.0)” (not the legacy Twitter provider) and set the callback URL in the X Developer Portal to your Supabase auth callback.";
  }

  if (lower.includes("provider is not enabled") || lower.includes("unsupported provider")) {
    return "X sign-in is not turned on in Supabase yet. Open your project → Authentication → Providers → enable “X / Twitter (OAuth 2.0)”, paste your Client ID and Client Secret from developer.x.com, then Save.";
  }

  return text;
}
