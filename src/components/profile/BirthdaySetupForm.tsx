"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Cake, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  formatBirthdayShort,
  maxBirthdayInputValue,
  minBirthdayInputValue,
  validateDateOfBirth,
} from "@/lib/birthday";
import { formatBirthdate } from "@/lib/social";
import type { Profile } from "@/lib/types";

export function BirthdaySetupForm({
  profile,
  nextHref = "/chat",
  showSkip = true,
}: {
  profile: Profile;
  nextHref?: string;
  showSkip?: boolean;
}) {
  const router = useRouter();
  const [dateOfBirth, setDateOfBirth] = useState(profile.date_of_birth ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validationError = validateDateOfBirth(dateOfBirth);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!dateOfBirth) {
      setError("Please choose your date of birth.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ date_of_birth: dateOfBirth })
      .eq("id", profile.id);

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSaved(true);
    router.refresh();
    router.push(nextHref);
  }

  const formatted = profile.date_of_birth
    ? formatBirthdate(profile.date_of_birth)
    : null;
  const celebrationDay = formatBirthdayShort(profile.date_of_birth);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-vintage-rust/15 text-vintage-rust">
          <Cake className="h-8 w-8" />
        </div>
        <h1 className="font-display text-2xl font-bold text-vintage-ink">
          {profile.date_of_birth ? "Your birthday" : "Add your birthday"}
        </h1>
        <p className="mt-2 max-w-sm text-sm text-vintage-ink-muted">
          {profile.date_of_birth
            ? "Update when you celebrate. Friends can see this on your profile."
            : "Let friends know when to celebrate you. Your full date appears on your profile."}
        </p>
      </div>

      {formatted && (
        <div className="vintage-card-inset px-4 py-3 text-center text-sm text-vintage-ink">
          Currently set to <strong>{formatted}</strong>
          {celebrationDay && (
            <span className="block mt-1 text-vintage-ink-muted">
              Friends see your day as {celebrationDay} each year
            </span>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="birthday"
            className="mb-1 block text-xs font-medium text-vintage-ink-muted"
          >
            Date of birth
          </label>
          <input
            id="birthday"
            type="date"
            value={dateOfBirth}
            onChange={(e) => {
              setDateOfBirth(e.target.value);
              setError(null);
            }}
            min={minBirthdayInputValue()}
            max={maxBirthdayInputValue()}
            required
            className="vintage-input w-full px-4 py-3 text-base"
          />
          <p className="mt-1.5 text-xs text-vintage-ink-muted">
            You must be at least 13. We use this for your profile and birthday shout-outs.
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-vintage-rust/10 px-3 py-2 text-sm text-vintage-rust">
            {error}
          </p>
        )}

        {saved && (
          <p className="rounded-lg bg-vintage-olive/15 px-3 py-2 text-sm text-vintage-ink">
            Birthday saved!
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="vintage-btn flex w-full items-center justify-center gap-2 py-3 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            "Save birthday"
          )}
        </button>

        {showSkip && !profile.date_of_birth && (
          <Link
            href={nextHref}
            className="block text-center text-sm font-medium text-vintage-ink-muted hover:text-vintage-rust"
          >
            Skip for now
          </Link>
        )}

        <Link
          href={`/profile/${profile.username}`}
          className="block text-center text-sm font-medium text-vintage-rust hover:underline"
        >
          Back to profile
        </Link>
      </form>
    </div>
  );
}
