"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ensureProfile } from "@/lib/auth";
import { safeNextPath } from "@/lib/app-url";
import { persistServerSession } from "@/lib/auth-session-sync";
import { formatOAuthError } from "@/lib/oauth-providers";

function AuthFinishInner() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Finishing sign-in…");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const next = safeNextPath(searchParams.get("next"), "/feed");
      const providerError =
        searchParams.get("error_description") ?? searchParams.get("error");
      if (providerError) {
        window.location.replace(
          `/login?error=${encodeURIComponent(formatOAuthError(providerError))}`,
        );
        return;
      }

      const code = searchParams.get("code");
      if (!code) {
        window.location.replace(
          `/login?error=${encodeURIComponent("Missing sign-in code")}`,
        );
        return;
      }

      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
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

        if (cancelled) return;

        const dest = profile.date_of_birth
          ? next
          : `/profile/birthday?next=${encodeURIComponent(next)}`;
        window.location.replace(dest);
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof Error ? err.message : "Could not finish sign in";
        setMessage(msg);
        window.location.replace(
          `/login?error=${encodeURIComponent(formatOAuthError(msg))}`,
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <main className="vintage-page flex min-h-screen items-center justify-center px-6">
      <p className="text-sm text-vintage-ink-muted">{message}</p>
    </main>
  );
}

export default function AuthFinishPage() {
  return (
    <Suspense
      fallback={
        <main className="vintage-page flex min-h-screen items-center justify-center px-6">
          <p className="text-sm text-vintage-ink-muted">Finishing sign-in…</p>
        </main>
      }
    >
      <AuthFinishInner />
    </Suspense>
  );
}
