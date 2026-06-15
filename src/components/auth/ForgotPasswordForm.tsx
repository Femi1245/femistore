"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { validateEmail } from "@/lib/auth-validation";
import { Logo } from "@/components/Logo";
import { TextField } from "@/components/auth/AuthFields";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const emailError = validateEmail(email);
    if (emailError) {
      setFieldError(emailError);
      return;
    }
    setFieldError(undefined);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        },
      );

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setSent(true);
    } catch {
      setError("Couldn't send the reset email. Check your connection and try again.");
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
          {sent ? (
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center vintage-card-inset">
                  <MailCheck className="h-6 w-6 text-vintage-olive" />
                </div>
              </div>
              <h1 className="font-display mb-1 text-2xl font-bold text-vintage-ink">
                Check your email
              </h1>
              <p className="mb-6 text-sm text-vintage-ink-muted">
                If an account exists for{" "}
                <span className="font-semibold text-vintage-ink">{email.trim()}</span>, we sent a
                link to reset your password. The link expires in 1 hour.
              </p>
              <Link href="/login" className="vintage-btn inline-block w-full py-3">
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-display mb-1 text-center text-2xl font-bold text-vintage-ink">
                Forgot your password?
              </h1>
              <p className="mb-6 text-center text-sm text-vintage-ink-muted">
                Enter your email and we&apos;ll send you a link to reset it.
              </p>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <TextField
                  id="email"
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(value) => {
                    setEmail(value);
                    if (fieldError) setFieldError(undefined);
                  }}
                  onBlur={() => setFieldError(validateEmail(email))}
                  error={fieldError}
                  placeholder="you@example.com"
                  autoComplete="email"
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
                  {loading ? "Sending…" : "Send reset link"}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-vintage-ink-muted">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 font-medium text-vintage-rust hover:underline"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
