/**
 * In-app OAuth for the Capacitor Android shell.
 *
 * Order of attempts:
 * 1) window.ZumeliaNative.openAuth (Java Custom Tabs — works even if Capacitor plugins fail)
 * 2) @capacitor/browser Custom Tab
 * 3) Caller should fall back to WebView navigation + /auth/callback
 */

import { createClient } from "@/lib/supabase/client";
import { ensureProfile } from "@/lib/auth";
import { safeNextPath } from "@/lib/app-url";
import { persistServerSession } from "@/lib/auth-session-sync";
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

type ZumeliaNativeBridge = {
  openAuth: (url: string) => void;
  isNative?: () => boolean;
};

const PENDING_FLAG = "zumelia-oauth-pending";

let pendingOAuth: PendingOAuth | null = null;
let listenerBoot: Promise<void> | null = null;
let deepLinkHandledAt = 0;
let deepLinkWindowHooked = false;

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

function getZumeliaNative(): ZumeliaNativeBridge | null {
  if (typeof window === "undefined") return null;
  const bridge = (
    window as Window & { ZumeliaNative?: ZumeliaNativeBridge }
  ).ZumeliaNative;
  if (bridge && typeof bridge.openAuth === "function") return bridge;
  return null;
}

/** True when running inside the Zumelia APK WebView. */
export function isZumeliaAndroidShell(): boolean {
  if (typeof window === "undefined") return false;
  if (getZumeliaNative()) return true;
  if (isCapacitorNative()) return true;
  return isCapacitorAppShell() && /ZumeliaNativeApp/i.test(navigator.userAgent);
}

export async function waitForZumeliaNative(
  timeoutMs = 2500,
): Promise<ZumeliaNativeBridge | null> {
  const existing = getZumeliaNative();
  if (existing) return existing;
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    await sleep(100);
    const bridge = getZumeliaNative();
    if (bridge) return bridge;
  }
  return getZumeliaNative();
}

export async function waitForCapacitorBridge(
  timeoutMs = 3000,
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (getZumeliaNative()) return true;
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
    if (getZumeliaNative()) return true;
    await sleep(100);
  }

  return Boolean(getZumeliaNative() || isCapacitorNative());
}

export async function shouldUseNativeOAuth(): Promise<boolean> {
  return isZumeliaAndroidShell() || (await waitForCapacitorBridge(1500));
}

export function canUseInAppOAuth(): boolean {
  return isZumeliaAndroidShell();
}

export async function waitForInAppOAuth(): Promise<boolean> {
  return shouldUseNativeOAuth();
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

function hookWindowDeepLinkHandler() {
  if (typeof window === "undefined" || deepLinkWindowHooked) return;
  deepLinkWindowHooked = true;

  const w = window as Window & {
    __zumeliaHandleAuthDeepLink?: (url: string) => void;
    __zumeliaPendingAuthDeepLink?: string;
  };

  w.__zumeliaHandleAuthDeepLink = (url: string) => {
    void handleDeepLink(url);
  };

  if (w.__zumeliaPendingAuthDeepLink) {
    const pending = w.__zumeliaPendingAuthDeepLink;
    w.__zumeliaPendingAuthDeepLink = undefined;
    void handleDeepLink(pending);
  }
}

/** Start listening for OAuth deep links (idempotent, never throws). */
export function ensureNativeOAuthListener(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  hookWindowDeepLinkHandler();
  if (!isZumeliaAndroidShell() && !isCapacitorAppShell()) {
    return Promise.resolve();
  }
  if (listenerBoot) return listenerBoot;

  listenerBoot = (async () => {
    try {
      await waitForCapacitorBridge(2000);
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
        // optional
      }

      const launch = await App.getLaunchUrl();
      if (launch?.url) void handleDeepLink(launch.url);
    } catch {
      // Java bridge + window hook still handle return.
    }
  })();

  return listenerBoot;
}

/**
 * Open OAuth in Custom Tab (Java bridge preferred), wait for deep-link return.
 * Throws if neither Java bridge nor Capacitor Browser can open the URL.
 */
export async function runNativeOAuth(
  oauthUrl: string,
): Promise<NativeOAuthResult> {
  await ensureNativeOAuthListener();
  hookWindowDeepLinkHandler();

  const javaBridge = await waitForZumeliaNative(2000);
  markOAuthPending(true);

  return new Promise<NativeOAuthResult>((resolve, reject) => {
    pendingOAuth = { resolve, reject };

    const fail = (err: unknown) => {
      pendingOAuth = null;
      markOAuthPending(false);
      reject(
        new Error(
          oauthErrorMessage(err, "Could not open the sign-in window"),
        ),
      );
    };

    if (javaBridge) {
      try {
        javaBridge.openAuth(oauthUrl);
        return;
      } catch (err) {
        fail(err);
        return;
      }
    }

    void (async () => {
      try {
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({ url: oauthUrl, toolbarColor: "#FAF8F5" });
      } catch (err) {
        fail(err);
      }
    })();
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
    if (error || !data.user || !data.session) {
      throw new Error(error?.message ?? "Could not sign in");
    }
    const { profile, error: profileError } = await ensureProfile(
      supabase,
      data.user,
    );
    if (!profile) {
      throw new Error(profileError ?? "Could not create profile");
    }
    await persistServerSession(
      data.session.access_token,
      data.session.refresh_token,
    );
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
    if (error || !data.user || !data.session) {
      throw new Error(error?.message ?? "Could not sign in");
    }
    const { profile, error: profileError } = await ensureProfile(
      supabase,
      data.user,
    );
    if (!profile) {
      throw new Error(profileError ?? "Could not create profile");
    }
    await persistServerSession(
      data.session.access_token,
      data.session.refresh_token,
    );
    const dest = profile.date_of_birth
      ? next
      : `/profile/birthday?next=${encodeURIComponent(next)}`;
    window.location.replace(dest);
    return;
  }

  throw new Error("Missing sign-in code");
}
