/**
 * In-app OAuth for the Capacitor Android/iOS shell.
 * Opens the provider in a Custom Tab, then returns via zumelia:// deep link.
 */

import { createClient } from "@/lib/supabase/client";
import { ensureProfile } from "@/lib/auth";
import { safeNextPath } from "@/lib/app-url";
import {
  hasCapacitorPlugin,
  isCapacitorAppShell,
  isCapacitorNative,
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

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/** Wait until the native Capacitor bridge is present (not just native=1 flag). */
export async function waitForCapacitorBridge(
  timeoutMs = 5000,
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (hasCapacitorPlugin("Browser") || hasCapacitorPlugin("App")) return true;

  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const cap = (
      window as Window & {
        Capacitor?: {
          isNativePlatform?: () => boolean;
          getPlatform?: () => string;
          isPluginAvailable?: (name: string) => boolean;
        };
      }
    ).Capacitor;

    if (cap?.isNativePlatform?.()) return true;
    const platform = cap?.getPlatform?.();
    if (platform === "android" || platform === "ios") return true;
    if (cap?.isPluginAvailable?.("Browser") || cap?.isPluginAvailable?.("App")) {
      return true;
    }
    await sleep(100);
  }

  return (
    hasCapacitorPlugin("Browser") ||
    hasCapacitorPlugin("App") ||
    isCapacitorNative()
  );
}

/**
 * True when we should run the Custom Tab OAuth flow.
 * Prefer live bridge detection over the persisted shell flag alone.
 */
export async function shouldUseNativeOAuth(): Promise<boolean> {
  if (!isCapacitorAppShell() && !isCapacitorNative()) return false;
  return waitForCapacitorBridge();
}

/** @deprecated use shouldUseNativeOAuth — kept for callers that need a sync hint */
export function canUseInAppOAuth(): boolean {
  return (
    isCapacitorNative() ||
    (isCapacitorAppShell() &&
      (hasCapacitorPlugin("Browser") || hasCapacitorPlugin("App")))
  );
}

export async function waitForInAppOAuth(timeoutMs = 5000): Promise<boolean> {
  return shouldUseNativeOAuth().then(async (ok) => {
    if (ok) return true;
    await waitForCapacitorBridge(timeoutMs);
    return canUseInAppOAuth() || isCapacitorNative();
  });
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
  if (!isCapacitorAppShell() && !isCapacitorNative()) {
    return Promise.resolve();
  }
  if (listenerBoot) return listenerBoot;

  listenerBoot = (async () => {
    try {
      await waitForCapacitorBridge(3000);
      const { App } = await import("@capacitor/app");

      await App.addListener("appUrlOpen", ({ url }) => {
        void handleDeepLink(url);
      });

      try {
        const { Browser } = await import("@capacitor/browser");
        await Browser.addListener("browserFinished", () => {
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
      } catch {
        // Browser plugin optional for listener boot
      }

      const launch = await App.getLaunchUrl();
      if (launch?.url) void handleDeepLink(launch.url);
    } catch {
      // Bridge still missing — OAuth will surface a clear error on tap.
    }
  })();

  return listenerBoot;
}

/**
 * Open provider OAuth URL in Custom Tab and wait for zumelia:// return.
 * Always attempts Browser.open when called — do not pre-block on isPluginAvailable.
 */
export async function runNativeOAuth(
  oauthUrl: string,
): Promise<NativeOAuthResult> {
  await ensureNativeOAuthListener();
  await waitForCapacitorBridge(5000);

  let Browser: typeof import("@capacitor/browser").Browser;
  try {
    ({ Browser } = await import("@capacitor/browser"));
  } catch (err) {
    throw new Error(
      oauthErrorMessage(
        err,
        "Sign-in browser module failed to load. Reinstall the latest Zumelia APK from the website.",
      ),
    );
  }

  markOAuthPending(true);

  return new Promise<NativeOAuthResult>((resolve, reject) => {
    pendingOAuth = { resolve, reject };
    void Browser.open({
      url: oauthUrl,
      toolbarColor: "#FAF8F5",
    }).catch((err) => {
      pendingOAuth = null;
      markOAuthPending(false);
      const raw = oauthErrorMessage(err, "Could not open sign-in");
      const needsUpdate =
        /not implemented|plugin|unavailable|Browser/i.test(raw);
      reject(
        new Error(
          needsUpdate
            ? "Google sign-in needs the latest Zumelia APK. Uninstall the app, then download again from itunes-mu.vercel.app/download"
            : raw,
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
