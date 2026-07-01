"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Loader2 } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { VERIFICATION_CATEGORIES, verificationCategoryLabel } from "@/lib/verification";
import type { Profile, VerificationCategory, VerificationRequest } from "@/lib/types";

export function VerificationRequestSection({ profile }: { profile: Profile }) {
  const [request, setRequest] = useState<VerificationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState<VerificationCategory>("public_figure");
  const [publicLinks, setPublicLinks] = useState("");
  const [applicantNote, setApplicantNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/verification/request");
      const data = (await res.json()) as { request: VerificationRequest | null };
      setRequest(data.request);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <section className="vintage-card p-5">
        <Loader2 className="h-5 w-5 animate-spin text-vintage-ink-muted" />
      </section>
    );
  }

  if (profile.is_verified) {
    return (
      <section className="vintage-card p-5">
        <div className="flex items-center gap-2">
          <VerifiedBadge category={profile.verified_category} />
          <h2 className="font-display text-lg font-semibold">Verified account</h2>
        </div>
        <p className="mt-2 text-sm text-vintage-ink-muted">
          You have a verified badge as{" "}
          <span className="font-medium text-vintage-ink">
            {verificationCategoryLabel(profile.verified_category)}
          </span>
          .
        </p>
      </section>
    );
  }

  if (request?.status === "pending") {
    return (
      <section className="vintage-card p-5">
        <h2 className="font-display flex items-center gap-2 text-lg font-semibold">
          <BadgeCheck className="h-5 w-5 text-sky-600" />
          Verification request
        </h2>
        <p className="mt-2 text-sm text-vintage-ink-muted">
          Your request is under review. We&apos;ll notify you when it&apos;s processed.
        </p>
        <p className="mt-1 text-xs text-vintage-ink-muted">
          Category: {verificationCategoryLabel(request.category)} · Submitted{" "}
          {new Date(request.created_at).toLocaleDateString()}
        </p>
      </section>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const res = await fetch("/api/verification/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, publicLinks, applicantNote }),
    });
    const data = (await res.json()) as { error?: string; request?: VerificationRequest };
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Could not submit request");
      return;
    }

    setRequest(data.request ?? null);
    setSuccess("Request submitted. Our team will review it.");
  }

  return (
    <section className="vintage-card p-5">
      <h2 className="font-display flex items-center gap-2 text-lg font-semibold">
        <BadgeCheck className="h-5 w-5 text-sky-600" />
        Request verification
      </h2>
      <p className="mt-1 text-sm text-vintage-ink-muted">
        For public figures, celebrities, and official accounts. Add links to your other verified
        profiles so we can confirm it&apos;s really you.
      </p>

      {request?.status === "rejected" && (
        <p className="mt-3 rounded-lg bg-vintage-rust/10 px-3 py-2 text-sm text-vintage-rust">
          Your last request was not approved
          {request.admin_note ? `: ${request.admin_note}` : "."} You may submit again with more
          detail.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-vintage-ink-muted">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as VerificationCategory)}
            className="vintage-input w-full px-3 py-2 text-sm"
          >
            {VERIFICATION_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-vintage-ink-muted">
            Public profile links
          </label>
          <textarea
            value={publicLinks}
            onChange={(e) => setPublicLinks(e.target.value)}
            rows={3}
            placeholder="https://instagram.com/you&#10;https://x.com/you"
            className="vintage-input w-full resize-none px-3 py-2 text-sm"
            required
          />
          <p className="mt-1 text-[10px] text-vintage-ink-muted">One URL per line (https only)</p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-vintage-ink-muted">
            Why should you be verified? (optional)
          </label>
          <textarea
            value={applicantNote}
            onChange={(e) => setApplicantNote(e.target.value)}
            rows={3}
            placeholder="Brief note for the review team…"
            className="vintage-input w-full resize-none px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-sm text-vintage-rust">{error}</p>}
        {success && <p className="text-sm text-vintage-olive">{success}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="vintage-btn px-4 py-2 text-sm disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit for review"}
        </button>
      </form>
    </section>
  );
}
