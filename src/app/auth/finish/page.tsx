"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";
import { ensureProfile } from "@/lib/auth";
import { safeNextPath } from "@/lib/app-url";
import { persistServerSession } from "@/lib/auth-session-sync";
import { formatOAuthError } from "@/lib/oauth-providers";

const LOCK_PREFIX = "zumelia-oauth-finish:";

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function isBenignCodeReuseError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("already") ||
    lower.includes("reuse") ||
    lower.includes("code verifier") ||
    lower.includes("invalid_grant") ||
    lower.includes("expired") ||
    lower.includes("used")
  );
}

async function waitForExistingSession(timeoutMs = 2500) {
  const supabase = createClient();
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token && data.session.refresh_token) {
      return data.session;
    }
    await sleep(150);
  }
  return null;
}

async function enterApp(next: string) {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error("Signed in, but session was missing");
  }

  const { profile, error: profileError } = await ensureProfile(
    supabase,
    session.user,
  );
  if (!profile) {
    throw new Error(profileError ?? "Could not create profile");
  }

  await persistServerSession(session.access_token, session.refresh_token);

  const dest = profile.date_of_birth
    ? next
    : `/profile/birthday?next=${encodeURIComponent(next)}`;
  window.location.replace(dest);
}

function AuthFinishInner() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Signing you in…");

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
        // Maybe we already finished and landed here without a code.
        const existing = await waitForExistingSession(800);
        if (existing && !cancelled) {
          setMessage("Opening your feed…");
          await enterApp(next);
          return;
        }
        window.location.replace(
          `/login?error=${encodeURIComponent("Missing sign-in code")}`,
        );
        return;
      }

      const lockKey = `${LOCK_PREFIX}${code.slice(0, 24)}`;
      const lockState = sessionStorage.getItem(lockKey);

      if (lockState === "done") {
        setMessage("Opening your feed…");
        await enterApp(next);
        return;
      }

      if (lockState === "busy") {
        setMessage("Almost there…");
        const existing = await waitForExistingSession(4000);
        if (cancelled) return;
        if (existing) {
          sessionStorage.setItem(lockKey, "done");
          setMessage("Opening your feed…");
          await enterApp(next);
          return;
        }
      }

      sessionStorage.setItem(lockKey, "busy");

      try {
        const supabase = createClient();
        // If a parallel remount already exchanged the code, reuse the session.
        const preexisting = await supabase.auth.getSession();
        if (!preexisting.data.session) {
          const { data, error } =
            await supabase.auth.exchangeCodeForSession(code);
          if (error || !data.user || !data.session) {
            throw new Error(error?.message ?? "Could not sign in");
          }
        }

        if (cancelled) return;
        sessionStorage.setItem(lockKey, "done");
        setMessage("Opening your feed…");
        await enterApp(next);
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof Error ? err.message : "Could not finish sign in";

        // React remounts / double-navigation often reuse the same code once.
        if (isBenignCodeReuseError(msg)) {
          const recovered = await waitForExistingSession(2000);
          if (recovered) {
            sessionStorage.setItem(lockKey, "done");
            setMessage("Opening your feed…");
            await enterApp(next);
            return;
          }
        }

        sessionStorage.removeItem(lockKey);
        // Stay on a calm loading screen — don't flash raw errors mid-redirect.
        setMessage("Taking you in…");
        const recovered = await waitForExistingSession(1200);
        if (recovered) {
          sessionStorage.setItem(lockKey, "done");
          await enterApp(next);
          return;
        }

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
    <main className="vintage-page flex min-h-dvh items-center justify-center px-4 py-10 sm:px-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
        <Logo size="lg" />
        <Loader2
          className="h-7 w-7 animate-spin text-vintage-rust"
          aria-hidden
        />
        <p className="text-sm text-vintage-ink-muted sm:text-base">{message}</p>
      </div>
    </main>
  );
}

export default function AuthFinishPage() {
  return (
    <Suspense
      fallback={
        <main className="vintage-page flex min-h-dvh items-center justify-center px-4">
          <div className="flex flex-col items-center gap-3">
            <Logo size="lg" />
            <Loader2 className="h-7 w-7 animate-spin text-vintage-rust" />
            <p className="text-sm text-vintage-ink-muted">Signing you in…</p>
          </div>
        </main>
      }
    >
      <AuthFinishInner />
    </Suspense>
  );
}
