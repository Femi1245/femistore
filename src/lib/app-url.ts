/** Server-side canonical origin (emails, metadata). */
export function getAppOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}

/**
 * Origin for browser OAuth / password-reset redirects.
 * Always use the tab the user is on so PKCE cookies match the callback URL.
 */
export function getAuthRedirectOrigin(preferred?: string): string {
  if (preferred) return preferred.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return getAppOrigin();
}

export function safeNextPath(next: string | null | undefined, fallback = "/chat"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

export function authCallbackUrl(next?: string, origin?: string): string {
  const base = `${getAuthRedirectOrigin(origin)}/auth/callback`;
  if (!next || next === "/chat") return base;
  return `${base}?next=${encodeURIComponent(next)}`;
}

/**
 * HTTPS bridge used by the native app OAuth flow.
 * Supabase redirects here (allowed HTTPS URL); the page immediately bounces to
 * `zumelia://auth/callback` so the Capacitor WebView can finish the session.
 */
export function nativeOAuthBridgeUrl(next?: string, origin?: string): string {
  const base = `${getAuthRedirectOrigin(origin)}/auth/native-bridge`;
  if (!next || next === "/chat") return base;
  return `${base}?next=${encodeURIComponent(next)}`;
}

/** Deep link the Android/iOS app listens for after OAuth. */
export function nativeOAuthDeepLinkUrl(search = "", hash = ""): string {
  const q = search.startsWith("?") || search === "" ? search : `?${search}`;
  const h = hash.startsWith("#") || hash === "" ? hash : `#${hash}`;
  return `zumelia://auth/callback${q}${h}`;
}
