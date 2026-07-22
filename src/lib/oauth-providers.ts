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

  if (
    lower.includes("pkce") ||
    lower.includes("code verifier") ||
    lower.includes("auth code and code verifier") ||
    lower.includes("invalid_grant") ||
    (lower.includes("code") && lower.includes("expired"))
  ) {
    return "Sign-in almost finished — tap Continue with Google once more if you are not signed in yet.";
  }

  if (
    lower.includes("redirect") &&
    (lower.includes("not allowed") ||
      lower.includes("mismatch") ||
      lower.includes("uri") ||
      lower.includes("requested"))
  ) {
    return "This sign-in URL is not allowed in Supabase. Open Authentication → URL Configuration and add your site callback, e.g. https://itunes-mu.vercel.app/auth/callback and http://localhost:3000/auth/callback.";
  }

  if (lower.includes("provider is not enabled") || lower.includes("unsupported provider")) {
    return "That sign-in provider is not enabled in Supabase yet. Open Authentication → Providers, turn on Google / GitHub / X, and save your OAuth client ID and secret.";
  }

  if (lower.includes("invalid_client")) {
    return "OAuth client credentials are wrong in Supabase. For X, use OAuth 2.0 Client ID and Secret from developer.x.com (not legacy API keys). For Google/GitHub, paste the client ID and secret from their developer consoles.";
  }

  if (
    lower.includes("invalid_request") ||
    lower.includes("oauth state parameter") ||
    lower.includes("access_denied")
  ) {
    return "Sign-in was cancelled or could not complete. Try again, or use email and password instead.";
  }

  if (lower.includes("email") && lower.includes("not confirmed")) {
    return "Confirm your email first, then sign in again.";
  }

  return text;
}
