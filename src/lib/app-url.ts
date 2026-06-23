/** Canonical app origin for auth redirects (client + server). */
export function getAppOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}

export function safeNextPath(next: string | null | undefined, fallback = "/chat"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

export function authCallbackUrl(next?: string): string {
  const base = `${getAppOrigin()}/auth/callback`;
  if (!next || next === "/chat") return base;
  return `${base}?next=${encodeURIComponent(next)}`;
}
