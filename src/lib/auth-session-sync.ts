/** Sync a client Supabase session into HTTP cookies for Next.js SSR. */

export async function persistServerSession(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  try {
    const res = await fetch("/api/auth/set-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      console.warn(
        "[auth] set-session failed:",
        data?.error ?? res.statusText,
      );
    }
  } catch (err) {
    console.warn("[auth] set-session request failed:", err);
  }
}
