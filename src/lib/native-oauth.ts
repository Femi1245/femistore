/**
 * In-app OAuth for the Capacitor Android/iOS shell.
 * Opens the provider in a Custom Tab (not Chrome), then returns via zumelia:// deep link.
 */

import { createClient } from "@/lib/supabase/client";
import { ensureProfile } from "@/lib/auth";
import { safeNextPath } from "@/lib/app-url";
import { isCapacitorNative } from "@/lib/native-shell";

export const NATIVE_OAUTH_DEEP_LINK_HOST = "auth/callback";

export type NativeOAuthResult = {
  code?: string;
  error?: string;
  next?: string;
  access_token?: string;
  refresh_token?: string;
};

type PendingOAuth = {
  resolve: (value: NativeOAuthResult) => void;
  reject: (reason?: unknown) => void;
};

let pendingOAuth: PendingOAuth | null = null;
let listenerBoot: Promise<void> | null = null;

export function canUseInAppOAuth(): boolean {
  return isCapacitorNative();
}

export function isNativeAuthDeepLink(url: string): boolean {
  return (
    url.startsWith("zumelia://auth/callback") ||
    url.includes("://auth/callback") ||
    url.includes("/auth/native-bridge")
  );
}

export function parseAuthCallbackUrl(url: string): NativeOAuthResult {
  try {
    const normalized = url.startsWith("zumelia://")
      ? url.replace("zumelia://", "https://zumelia.local/")
      : url;
    const parsed = new URL(normalized);
    const params = new URLSearchParams(parsed.search);
    if (parsed.hash) {
      const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ""));
      hashParams.forEach((value, key) => {
        if (!params.has(key)) params.set(key, value);
      });
    }
    return {
      code: params.get("code") ?? undefined,
      error:
        params.get("error_description") ?? params.get("error") ?? undefined,
      next: params.get("next") ?? undefined,
      access_token: params.get("access_token") ?? undefined,
      refresh_token: params.get("refresh_token") ?? undefined,
    };
  } catch {
    return { error: "Invalid sign-in return URL" };
  }
}

async function closeInAppBrowser() {
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.close();
  } catch {
    // already closed
  }
}

async function handleDeepLink(url: string) {
  if (!isNativeAuthDeepLink(url)) return;
  const result = parseAuthCallbackUrl(url);

  // Clear waiter before closing the Custom Tab so browserFinished cannot
  // race and report a false "cancelled" after a successful return.
  if (pendingOAuth) {
    const pending = pendingOAuth;
    pendingOAuth = null;
    pending.resolve(result);
    await closeInAppBrowser();
    return;
  }

  await closeInAppBrowser();

  // Cold start / app resumed with auth deep link while no waiter is active
  if (result.error) {
    window.location.replace(
      `/login?error=${encodeURIComponent(result.error)}`,
    );
    return;
  }

  try {
    await applyNativeOAuthResult(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not finish sign in";
    window.location.replace(`/login?error=${encodeURIComponent(message)}`);
  }
}

/** Start listening for OAuth deep links (idempotent). */
export function ensureNativeOAuthListener(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!isCapacitorNative()) return Promise.resolve();
  if (listenerBoot) return listenerBoot;

  listenerBoot = (async () => {
    const { App } = await import("@capacitor/app");
    const { Browser } = await import("@capacitor/browser");

    await App.addListener("appUrlOpen", ({ url }) => {
      void handleDeepLink(url);
    });

    await Browser.addListener("browserFinished", () => {
      if (!pendingOAuth) return;
      const pending = pendingOAuth;
      pendingOAuth = null;
      pending.resolve({ error: "Sign-in was cancelled" });
    });

    try {
      const launch = await App.getLaunchUrl();
      if (launch?.url) void handleDeepLink(launch.url);
    } catch {
      // ignore
    }
  })();

  return listenerBoot;
}

/** Open provider OAuth URL in an in-app browser and wait for the deep-link return. */
export async function runNativeOAuth(
  oauthUrl: string,
): Promise<NativeOAuthResult> {
  await ensureNativeOAuthListener();
  const { Browser } = await import("@capacitor/browser");

  return new Promise<NativeOAuthResult>((resolve, reject) => {
    pendingOAuth = { resolve, reject };
    void Browser.open({
      url: oauthUrl,
      presentationStyle: "popover",
      toolbarColor: "#FAF8F5",
    }).catch((err) => {
      pendingOAuth = null;
      reject(err);
    });
  });
}

/** Exchange OAuth code / tokens inside the WebView session, then navigate. */
export async function applyNativeOAuthResult(
  result: NativeOAuthResult,
): Promise<void> {
  if (result.error) {
    throw new Error(result.error);
  }

  const supabase = createClient();
  const next = safeNextPath(result.next, "/feed");

  if (result.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(
      result.code,
    );
    if (error || !data.user) {
      throw new Error(error?.message ?? "Could not sign in");
    }
    const { profile, error: profileError } = await ensureProfile(
      supabase,
      data.user,
    );
    if (!profile) {
      throw new Error(profileError ?? "Could not create profile");
    }
    const dest = profile.date_of_birth
      ? next
      : `/profile/birthday?next=${encodeURIComponent(next)}`;
    window.location.replace(dest);
    return;
  }

  if (result.access_token && result.refresh_token) {
    const { data, error } = await supabase.auth.setSession({
      access_token: result.access_token,
      refresh_token: result.refresh_token,
    });
    if (error || !data.user) {
      throw new Error(error?.message ?? "Could not sign in");
    }
    const { profile, error: profileError } = await ensureProfile(
      supabase,
      data.user,
    );
    if (!profile) {
      throw new Error(profileError ?? "Could not create profile");
    }
    const dest = profile.date_of_birth
      ? next
      : `/profile/birthday?next=${encodeURIComponent(next)}`;
    window.location.replace(dest);
    return;
  }

  throw new Error("Missing sign-in code");
}
