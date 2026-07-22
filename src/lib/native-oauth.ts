/**
 * In-app OAuth for the Capacitor Android/iOS shell.
 * Opens the provider in a Custom Tab, then returns via zumelia:// deep link.
 * Never navigates the WebView to Google/X/GitHub — that escapes into Chrome
 * and leaves the session cookies outside the app.
 */

import { createClient } from "@/lib/supabase/client";
import { ensureProfile } from "@/lib/auth";
import { safeNextPath } from "@/lib/app-url";
import {
  hasCapacitorPlugin,
  isCapacitorAppShell,
} from "@/lib/native-shell";

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

const PENDING_FLAG = "zumelia-oauth-pending";

let pendingOAuth: PendingOAuth | null = null;
let listenerBoot: Promise<void> | null = null;
let deepLinkHandledAt = 0;

function oauthErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

function markOAuthPending(active: boolean) {
  try {
    if (active) sessionStorage.setItem(PENDING_FLAG, "1");
    else sessionStorage.removeItem(PENDING_FLAG);
  } catch {
    // ignore
  }
}

function isOAuthPending(): boolean {
  try {
    return sessionStorage.getItem(PENDING_FLAG) === "1";
  } catch {
    return false;
  }
}

/** Custom Tab flow — needs @capacitor/browser + @capacitor/app in the APK. */
export function canUseInAppOAuth(): boolean {
  return (
    isCapacitorAppShell() &&
    hasCapacitorPlugin("Browser") &&
    hasCapacitorPlugin("App")
  );
}

/** Wait for the native bridge — plugins are sometimes late after WebView boot. */
export async function waitForInAppOAuth(timeoutMs = 4000): Promise<boolean> {
  if (!isCapacitorAppShell()) return false;
  if (canUseInAppOAuth()) return true;

  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    await new Promise((r) => window.setTimeout(r, 150));
    if (canUseInAppOAuth()) return true;
  }
  return canUseInAppOAuth();
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
  deepLinkHandledAt = Date.now();
  const result = parseAuthCallbackUrl(url);
  markOAuthPending(false);

  if (pendingOAuth) {
    const pending = pendingOAuth;
    pendingOAuth = null;
    pending.resolve(result);
    await closeInAppBrowser();
    return;
  }

  await closeInAppBrowser();

  if (result.error) {
    window.location.replace(
      `/login?error=${encodeURIComponent(result.error)}`,
    );
    return;
  }

  try {
    await applyNativeOAuthResult(result);
  } catch (err) {
    window.location.replace(
      `/login?error=${encodeURIComponent(oauthErrorMessage(err, "Could not finish sign in"))}`,
    );
  }
}

/** Start listening for OAuth deep links (idempotent, never throws). */
export function ensureNativeOAuthListener(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!isCapacitorAppShell()) return Promise.resolve();
  if (listenerBoot) return listenerBoot;

  listenerBoot = (async () => {
    try {
      const { App } = await import("@capacitor/app");

      await App.addListener("appUrlOpen", ({ url }) => {
        void handleDeepLink(url);
      });

      if (hasCapacitorPlugin("Browser")) {
        const { Browser } = await import("@capacitor/browser");
        await Browser.addListener("browserFinished", () => {
          // Deep link often arrives just as the Custom Tab closes — wait before cancelling.
          window.setTimeout(() => {
            if (Date.now() - deepLinkHandledAt < 2000) return;
            if (!pendingOAuth && !isOAuthPending()) return;
            if (!pendingOAuth) {
              markOAuthPending(false);
              return;
            }
            const pending = pendingOAuth;
            pendingOAuth = null;
            markOAuthPending(false);
            pending.resolve({ error: "Sign-in was cancelled" });
          }, 1600);
        });
      }

      const launch = await App.getLaunchUrl();
      if (launch?.url) void handleDeepLink(launch.url);
    } catch {
      // Missing native plugins — user needs an updated APK.
    }
  })();

  return listenerBoot;
}

/** Open provider OAuth URL in an in-app browser and wait for the deep-link return. */
export async function runNativeOAuth(
  oauthUrl: string,
): Promise<NativeOAuthResult> {
  await ensureNativeOAuthListener();

  if (!hasCapacitorPlugin("Browser")) {
    throw new Error(
      "This app build cannot open secure sign-in. Uninstall Zumelia, then install the latest APK from GitHub Releases.",
    );
  }

  const { Browser } = await import("@capacitor/browser");
  markOAuthPending(true);

  return new Promise<NativeOAuthResult>((resolve, reject) => {
    pendingOAuth = { resolve, reject };
    void Browser.open({
      url: oauthUrl,
      toolbarColor: "#FAF8F5",
    }).catch((err) => {
      pendingOAuth = null;
      markOAuthPending(false);
      reject(
        new Error(
          oauthErrorMessage(
            err,
            "Could not open the sign-in window. Update the Zumelia app and try again.",
          ),
        ),
      );
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
