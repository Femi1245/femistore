"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { validatePassword } from "@/lib/auth-validation";
import { Logo } from "@/components/Logo";
import { PasswordInput } from "@/components/auth/AuthFields";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

type SessionState = "checking" | "ready" | "invalid";

export function ResetPasswordForm() {
  const router = useRouter();
  const [sessionState, setSessionState] = useState<SessionState>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    password?: string;
    confirm?: string;
  }>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (cancelled) return;
        setSessionState(data.user ? "ready" : "invalid");
      })
      .catch(() => {
        if (!cancelled) setSessionState("invalid");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const errors: { password?: string; confirm?: string } = {};
    const passwordError = validatePassword(password, "signup");
    if (passwordError) errors.password = passwordError;
    if (password !== confirm) errors.confirm = "Passwords do not match.";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setLoading(true);

    try {
      const { error: updateError } = await createClient().auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setDone(true);
      setTimeout(() => {
        router.push("/chat");
        router.refresh();
      }, 1500);
    } catch {
      setError("Couldn't update your password. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="vintage-page relative flex min-h-full flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>

        <div className="vintage-card p-8">
          {sessionState === "checking" ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-6 w-6 animate-spin text-vintage-rust" />
              <p className="text-sm text-vintage-ink-muted">Verifying your reset link…</p>
            </div>
          ) : sessionState === "invalid" ? (
            <div className="text-center">
              <h1 className="font-display mb-1 text-2xl font-bold text-vintage-ink">
                Link expired or invalid
              </h1>
              <p className="mb-6 text-sm text-vintage-ink-muted">
                This password reset link is no longer valid. Request a new one to continue.
              </p>
              <Link href="/forgot-password" className="vintage-btn inline-block w-full py-3">
                Request a new link
              </Link>
            </div>
          ) : done ? (
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center vintage-card-inset">
                  <CheckCircle2 className="h-6 w-6 text-vintage-olive" />
                </div>
              </div>
              <h1 className="font-display mb-1 text-2xl font-bold text-vintage-ink">
                Password updated
              </h1>
              <p className="text-sm text-vintage-ink-muted">Taking you to your chats…</p>
            </div>
          ) : (
            <>
              <h1 className="font-display mb-1 text-center text-2xl font-bold text-vintage-ink">
                Set a new password
              </h1>
              <p className="mb-6 text-center text-sm text-vintage-ink-muted">
                Choose a strong password you don&apos;t use anywhere else.
              </p>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <PasswordInput
                  id="password"
                  label="New password"
                  value={password}
                  onChange={(value) => {
                    setPassword(value);
                    if (fieldErrors.password) {
                      setFieldErrors((p) => ({ ...p, password: undefined }));
                    }
                  }}
                  error={fieldErrors.password}
                  autoComplete="new-password"
                />

                <PasswordInput
                  id="confirm"
                  label="Confirm new password"
                  value={confirm}
                  onChange={(value) => {
                    setConfirm(value);
                    if (fieldErrors.confirm) {
                      setFieldErrors((p) => ({ ...p, confirm: undefined }));
                    }
                  }}
                  error={fieldErrors.confirm}
                  autoComplete="new-password"
                />

                {error && (
                  <p className="vintage-card-inset px-3 py-2 text-sm text-vintage-rust">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="vintage-btn w-full py-3 disabled:opacity-50"
                >
                  {loading ? "Updating…" : "Update password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
