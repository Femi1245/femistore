import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import { ensureProfile } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

export type OAuthProvider = "google" | "github" | "twitter";

export function getOAuthRedirectUri(): string {
  return makeRedirectUri({
    scheme: "itunes",
    path: "auth/callback",
  });
}

export async function createSessionFromUrl(url: string): Promise<void> {
  const { params, errorCode } = QueryParams.getQueryParams(url);

  if (errorCode) {
    throw new Error(errorCode);
  }

  const supabase = getSupabase();

  if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) throw error;
    return;
  }

  const access_token = params.access_token;
  const refresh_token = params.refresh_token;

  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (error) throw error;
  }
}

export async function signInWithOAuthProvider(
  provider: OAuthProvider,
): Promise<{ error?: string; cancelled?: boolean }> {
  const supabase = getSupabase();
  const redirectTo = getOAuthRedirectUri();

  if (__DEV__) {
    console.log("[iTunes] OAuth redirect URL (add to Supabase if needed):", redirectTo);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) return { error: error.message };
  if (!data?.url) return { error: "Could not start sign in." };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type === "cancel" || result.type === "dismiss") {
    return { cancelled: true };
  }

  if (result.type !== "success") {
    return { error: "Sign in was not completed." };
  }

  await createSessionFromUrl(result.url);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const profileResult = await ensureProfile(supabase, user);
    if (profileResult.error) return { error: profileResult.error };
  }

  return {};
}
