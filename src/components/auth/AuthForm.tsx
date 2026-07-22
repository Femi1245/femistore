"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ensureProfile } from "@/lib/auth";
import {
  type AuthField,
  type AuthFieldErrors,
  cleanUsername,
  validateAuthForm,
  validateDisplayName,
  validateEmail,
  validatePassword,
  validateUsername,
} from "@/lib/auth-validation";
import { validateDateOfBirth, maxBirthdayInputValue, minBirthdayInputValue } from "@/lib/birthday";
import { BUSINESS_CATEGORIES } from "@/lib/business";
import { COUNTRIES } from "@/lib/countries";
import {
  authCallbackUrl,
  nativeOAuthBridgeUrl,
  safeNextPath,
} from "@/lib/app-url";
import {
  applyNativeOAuthResult,
  ensureNativeOAuthListener,
  isZumeliaAndroidShell,
  runNativeOAuth,
  shouldUseNativeOAuth,
  waitForZumeliaNative,
} from "@/lib/native-oauth";
import { hasCapacitorPlugin, isCapacitorNative } from "@/lib/native-shell";
import { getAndroidApkUrl } from "@/lib/app-download";
import { formatOAuthError, toSupabaseOAuthProvider, type OAuthUiProvider } from "@/lib/oauth-providers";
import { Logo } from "@/components/Logo";
import { PasswordInput, TextField } from "@/components/auth/AuthFields";
import { SetupNotice } from "@/components/auth/SetupNotice";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

type Mode = "login" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const nextAfterAuth = safeNextPath(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [country, setCountry] = useState("Global");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [dateOfBirthError, setDateOfBirthError] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<"personal" | "business">("personal");
  const [businessName, setBusinessName] = useState("");
  const [businessCategory, setBusinessCategory] = useState("Other");
  const [error, setError] = useState<string | null>(null);
  const [needsApkUpdate, setNeedsApkUpdate] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthUiProvider | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Already signed in (e.g. reopening the native app / OAuth bounce) → feed
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        if (!cancelled && data.session) {
          // Don't flash a stale ?error= from a double OAuth exchange.
          window.location.replace(nextAfterAuth || "/feed");
          return;
        }
      } catch {
        // stay on auth form
      }
      if (!cancelled) {
        // Only show URL errors when there is no live session.
        if (urlError) {
          setError(formatOAuthError(urlError));
        }
        setCheckingSession(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nextAfterAuth, urlError]);

  useEffect(() => {
    void ensureNativeOAuthListener();
  }, []);

  async function handleOAuthSignIn(provider: OAuthUiProvider) {
    setError(null);
    setNeedsApkUpdate(false);
    setSuccess(null);
    setOauthLoading(provider);

    try {
      const supabase = createClient();
      const supabaseProvider = toSupabaseOAuthProvider(provider);
      const javaBridge = await waitForZumeliaNative(1200);
      const inAndroidShell =
        Boolean(javaBridge) ||
        isZumeliaAndroidShell() ||
        isCapacitorNative() ||
        (await shouldUseNativeOAuth());

      // Prefer Custom Tab only when a native opener is actually available.
      // Otherwise finish OAuth inside the WebView via /auth/callback.
      const useCustomTab =
        Boolean(javaBridge) || hasCapacitorPlugin("Browser");
      const redirectTo = useCustomTab
        ? nativeOAuthBridgeUrl(nextAfterAuth, window.location.origin)
        : authCallbackUrl(nextAfterAuth, window.location.origin);

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: supabaseProvider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          ...(provider === "google"
            ? {
                queryParams: {
                  access_type: "offline",
                  prompt: "consent",
                },
              }
            : {}),
        },
      });

      if (oauthError) {
        setError(formatOAuthError(oauthError.message));
        setOauthLoading(null);
        return;
      }

      if (data?.url) {
        if (useCustomTab) {
          try {
            const result = await runNativeOAuth(data.url);
            if (result.error) {
              setError(formatOAuthError(result.error));
              setOauthLoading(null);
              return;
            }
            await applyNativeOAuthResult(result);
            return;
          } catch {
            // Fall through to WebView OAuth below.
          }
        }

        if (inAndroidShell && useCustomTab) {
          // Custom Tab failed — restart OAuth finishing inside the WebView.
          const fallback = await supabase.auth.signInWithOAuth({
            provider: supabaseProvider,
            options: {
              redirectTo: authCallbackUrl(nextAfterAuth, window.location.origin),
              skipBrowserRedirect: true,
              ...(provider === "google"
                ? {
                    queryParams: {
                      access_type: "offline",
                      prompt: "consent",
                    },
                  }
                : {}),
            },
          });
          if (fallback.data?.url) {
            window.location.assign(fallback.data.url);
            return;
          }
        }

        // WebView / normal browser: navigate this window through Google.
        window.location.assign(data.url);
        return;
      }

      setError(
        `${provider === "twitter" ? "X" : provider === "github" ? "GitHub" : "Google"} sign-in could not start. Enable the provider in Supabase → Authentication → Providers.`,
      );
      setOauthLoading(null);
    } catch (err) {
      const message =
        err instanceof Error && err.message.trim()
          ? err.message
          : "Could not start sign in. Check your connection and Supabase auth settings.";
      if (/apk|reinstall|latest|plugin|not implemented/i.test(message)) {
        setNeedsApkUpdate(true);
      }
      setError(formatOAuthError(message));
      setOauthLoading(null);
    }
  }

  const oauthBusy = oauthLoading !== null;

  function validateField(field: AuthField) {
    let message: string | undefined;

    switch (field) {
      case "email":
        message = validateEmail(email);
        break;
      case "password":
        message = validatePassword(password, mode);
        break;
      case "displayName":
        message = validateDisplayName(displayName);
        break;
      case "username":
        message = validateUsername(username);
        break;
    }

    setFieldErrors((prev) => {
      const next = { ...prev };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  }

  function updateField(field: AuthField, value: string) {
    switch (field) {
      case "email":
        setEmail(value);
        break;
      case "password":
        setPassword(value);
        break;
      case "displayName":
        setDisplayName(value);
        break;
      case "username":
        setUsername(value);
        break;
    }

    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const errors = validateAuthForm(mode, {
      email,
      password,
      displayName,
      username,
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const supabase = createClient();

      if (mode === "signup") {
        const cleanUsernameValue = cleanUsername(username);

        if (accountType === "business" && !businessName.trim()) {
          setError("Business name is required for business accounts.");
          setLoading(false);
          return;
        }

        const dobError = dateOfBirth ? validateDateOfBirth(dateOfBirth) : undefined;
        if (dobError) {
          setDateOfBirthError(dobError);
          setLoading(false);
          return;
        }
        setDateOfBirthError(null);

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: {
              display_name: displayName.trim(),
              username: cleanUsernameValue,
              country,
              ...(dateOfBirth ? { date_of_birth: dateOfBirth } : {}),
              account_kind: accountType,
              ...(accountType === "business"
                ? {
                    business_name: businessName.trim(),
                    business_category: businessCategory,
                  }
                : {}),
            },
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        if (!data.user) {
          setError("Sign up failed. Please try again.");
          return;
        }

        if (data.session) {
          const { profile, error: profileError } = await ensureProfile(
            supabase,
            data.user,
          );
          if (!profile) {
            setError(profileError ?? "Could not create your profile.");
            return;
          }

          void fetch("/api/email/welcome", { method: "POST" });

          if (!profile.date_of_birth && !dateOfBirth) {
            window.location.assign(
              `/profile/birthday?next=${encodeURIComponent(
                accountType === "business" ? "/profile/business/setup" : nextAfterAuth,
              )}`,
            );
            return;
          }

          if (dateOfBirth && !profile.date_of_birth) {
            await supabase
              .from("profiles")
              .update({ date_of_birth: dateOfBirth })
              .eq("id", profile.id);
          }

          window.location.assign(
            accountType === "business" ? "/profile/business/setup" : nextAfterAuth,
          );
          return;
        }

        setSuccess(
          "Account created! Check your email for a confirmation link, then sign in here.",
        );
        return;
      }

      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (signInError) {
        if (signInError.message.toLowerCase().includes("email not confirmed")) {
          setError(
            "Please confirm your email first (check your inbox), or disable email confirmation in Supabase → Authentication → Providers → Email.",
          );
        } else {
          setError(signInError.message);
        }
        return;
      }

      if (!signInData.user) {
        setError("Sign in failed. Please try again.");
        return;
      }

      const { profile, error: profileError } = await ensureProfile(
        supabase,
        signInData.user,
      );
      if (!profile) {
        setError(profileError ?? "Could not load your profile.");
        return;
      }

      void fetch("/api/email/welcome", { method: "POST" });

      window.location.assign(nextAfterAuth);
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="vintage-page flex min-h-full flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Logo size="lg" href="/login" />
          <p className="text-sm text-vintage-ink-muted">Opening Zumelia…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="vintage-page relative flex min-h-full flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" href="/login" />
        </div>

        <div className="vintage-card p-8">
          <SetupNotice />
          <h1 className="font-display mb-1 text-center text-2xl font-bold text-vintage-ink">
            {mode === "login" ? "Welcome back" : "Join the world"}
          </h1>
          <p className="mb-6 text-center text-sm text-vintage-ink-muted">
            {mode === "login"
              ? "Sign in to continue chatting globally"
              : "Create your account and connect across borders"}
          </p>

          {mode === "login" && nextAfterAuth.startsWith("/admin") && (
            <p className="mb-4 rounded-lg bg-vintage-rust/10 px-3 py-2 text-center text-xs text-vintage-ink">
              <span className="font-semibold text-vintage-rust">Admin dashboard:</span> use your{" "}
              <span className="font-medium">email and password</span> — not your @username. After
              sign-in you&apos;ll return to admin.
            </p>
          )}

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleOAuthSignIn("google")}
              disabled={loading || oauthBusy}
              className="vintage-btn-outline flex w-full items-center justify-center gap-3 py-3 disabled:opacity-50"
            >
              <GoogleIcon />
              {oauthLoading === "google" ? "Redirecting to Google…" : "Continue with Google"}
            </button>

            <button
              type="button"
              onClick={() => handleOAuthSignIn("github")}
              disabled={loading || oauthBusy}
              className="vintage-btn-outline flex w-full items-center justify-center gap-3 py-3 disabled:opacity-50"
            >
              <GitHubIcon />
              {oauthLoading === "github" ? "Redirecting to GitHub…" : "Continue with GitHub"}
            </button>

            <button
              type="button"
              onClick={() => handleOAuthSignIn("twitter")}
              disabled={loading || oauthBusy}
              className="vintage-btn-outline flex w-full items-center justify-center gap-3 py-3 disabled:opacity-50"
            >
              <XIcon />
              {oauthLoading === "twitter" ? "Redirecting to X…" : "Continue with X"}
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-vintage-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wide">
              <span className="bg-vintage-paper px-3 text-vintage-ink-muted">or</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <p className="mb-2 text-xs font-medium text-vintage-ink-muted">Account type</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAccountType("personal")}
                      className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                        accountType === "personal"
                          ? "bg-vintage-rust/15 text-vintage-rust ring-1 ring-vintage-rust/40"
                          : "vintage-card-inset text-vintage-ink-muted"
                      }`}
                    >
                      Personal
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccountType("business")}
                      className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                        accountType === "business"
                          ? "bg-vintage-rust/15 text-vintage-rust ring-1 ring-vintage-rust/40"
                          : "vintage-card-inset text-vintage-ink-muted"
                      }`}
                    >
                      Business
                    </button>
                  </div>
                  <p className="mt-1.5 text-[11px] text-vintage-ink-muted">
                    {accountType === "business"
                      ? "Showcase your brand and reach customers on Zumelia."
                      : "Connect with friends and share your life."}
                  </p>
                </div>

                {accountType === "business" && (
                  <>
                    <TextField
                      id="businessName"
                      label="Business name"
                      value={businessName}
                      onChange={setBusinessName}
                      placeholder="Your brand or company name"
                    />
                    <div>
                      <label
                        htmlFor="businessCategory"
                        className="mb-1 block text-xs font-medium text-vintage-ink-muted"
                      >
                        Business category
                      </label>
                      <select
                        id="businessCategory"
                        value={businessCategory}
                        onChange={(e) => setBusinessCategory(e.target.value)}
                        className="vintage-input w-full px-4 py-2.5"
                      >
                        {BUSINESS_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <TextField
                  id="displayName"
                  label={accountType === "business" ? "Your name (owner / contact)" : "Display name"}
                  value={displayName}
                  onChange={(value) => updateField("displayName", value)}
                  onBlur={() => validateField("displayName")}
                  error={fieldErrors.displayName}
                  placeholder="How others see you"
                  autoComplete="name"
                />
                <TextField
                  id="username"
                  label="Username"
                  value={username}
                  onChange={(value) => updateField("username", value)}
                  onBlur={() => validateField("username")}
                  error={fieldErrors.username}
                  placeholder="unique_handle"
                  autoComplete="username"
                />
                <div>
                  <label
                    htmlFor="dateOfBirth"
                    className="mb-1 block text-xs font-medium text-vintage-ink-muted"
                  >
                    Date of birth
                  </label>
                  <input
                    id="dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => {
                      setDateOfBirth(e.target.value);
                      setDateOfBirthError(null);
                    }}
                    min={minBirthdayInputValue()}
                    max={maxBirthdayInputValue()}
                    className="vintage-input w-full px-4 py-2.5"
                  />
                  {dateOfBirthError ? (
                    <p className="mt-1 text-xs text-vintage-rust">{dateOfBirthError}</p>
                  ) : (
                    <p className="mt-1 text-[11px] text-vintage-ink-muted">
                      Optional now — you can add it later. Must be 13+.
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="country"
                    className="mb-1 block text-xs font-medium text-vintage-ink-muted"
                  >
                    Country / region
                  </label>
                  <select
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="vintage-input w-full px-4 py-2.5"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <TextField
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(value) => updateField("email", value)}
              onBlur={() => validateField("email")}
              error={fieldErrors.email}
              placeholder="you@example.com"
              autoComplete="email"
            />

            <PasswordInput
              id="password"
              label="Password"
              value={password}
              onChange={(value) => updateField("password", value)}
              onBlur={() => validateField("password")}
              error={fieldErrors.password}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />

            {mode === "login" && (
              <div className="text-right">
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-vintage-rust hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            )}

            {error && (
              <div className="vintage-card-inset space-y-2 px-3 py-2 text-sm text-vintage-rust">
                <p>{error}</p>
                {needsApkUpdate && (
                  <p>
                    <a
                      href={getAndroidApkUrl()}
                      className="font-semibold underline"
                      rel="noopener noreferrer"
                    >
                      Download latest Zumelia.apk
                    </a>
                    {" · "}
                    <Link href="/download" className="font-semibold underline">
                      Install guide
                    </Link>
                  </p>
                )}
              </div>
            )}

            {success && (
              <p className="vintage-card-inset px-3 py-2 text-sm text-vintage-olive">
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || oauthBusy}
              className="vintage-btn w-full py-3 disabled:opacity-50"
            >
              {loading ? "Please wait…" : mode === "login" ? "Sign in with email" : "Create account with email"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-vintage-ink-muted">
            {mode === "login" ? (
              <>
                New to Zumelia?{" "}
                <Link href="/signup" className="font-medium text-vintage-rust hover:underline">
                  Sign up free
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-vintage-rust hover:underline">
                  Sign in
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
