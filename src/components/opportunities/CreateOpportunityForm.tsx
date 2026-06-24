"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  COMPENSATION_TYPES,
  createOpportunity,
  OPPORTUNITY_CATEGORIES,
  OPPORTUNITY_TYPES,
  WORK_MODES,
  type CreateOpportunityInput,
} from "@/lib/opportunities";
import {
  canCreateServiceGigs,
  getBusinessProfileUrl,
  hasBusinessProfile,
} from "@/lib/business";
import type {
  OpportunityCompensation,
  OpportunityType,
  OpportunityWorkMode,
  Profile,
} from "@/lib/types";

function listServiceHref(user: Profile): string {
  if (canCreateServiceGigs(user)) return "/opportunities/new/service";
  if (hasBusinessProfile(user)) {
    return `${getBusinessProfileUrl(user.username)}?seller=1`;
  }
  return "/profile/business/setup";
}

export function CreateOpportunityForm({ user }: { user: Profile }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [opportunityType, setOpportunityType] = useState<OpportunityType>("gig");
  const [category, setCategory] = useState<string>(OPPORTUNITY_CATEGORIES[0]);
  const [location, setLocation] = useState(user.business_location ?? user.country ?? "");
  const [workMode, setWorkMode] = useState<OpportunityWorkMode>("remote");
  const [compensationType, setCompensationType] =
    useState<OpportunityCompensation>("negotiable");
  const [compensationDetail, setCompensationDetail] = useState("");
  const [applicationUrl, setApplicationUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const input: CreateOpportunityInput = {
      title,
      description,
      opportunity_type: opportunityType,
      listing_kind: "seeking",
      category,
      location,
      work_mode: workMode,
      compensation_type: compensationType,
      compensation_detail: compensationDetail,
      application_url: applicationUrl || undefined,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    };

    const { opportunity, error: err } = await createOpportunity(
      createClient(),
      user.id,
      input,
    );
    setSaving(false);

    if (err || !opportunity) {
      setError(err ?? "Could not create opportunity.");
      return;
    }

    router.push(`/opportunities/${opportunity.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="vintage-card space-y-5 p-5 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-bold text-vintage-ink">Post an opportunity</h1>
        <p className="mt-1 text-sm text-vintage-ink-muted">
          Share a job, gig, collab, or internship with the Zumelia community.
        </p>
        <Link
          href={listServiceHref(user)}
          className="mt-2 inline-flex text-sm font-semibold text-vintage-rust hover:underline"
        >
          Listing a product or service instead? →
        </Link>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-vintage-ink">Title</span>
        <input
          required
          minLength={3}
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Need a React developer for 2-week project"
          className="vintage-input w-full px-3 py-2.5 text-sm"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-vintage-ink">Description</span>
        <textarea
          required
          minLength={10}
          rows={6}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What you need, skills required, timeline, how to apply…"
          className="vintage-input w-full resize-y px-3 py-2.5 text-sm"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-vintage-ink">Type</span>
          <select
            value={opportunityType}
            onChange={(e) => setOpportunityType(e.target.value as OpportunityType)}
            className="vintage-input w-full px-3 py-2.5 text-sm"
          >
            {OPPORTUNITY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-vintage-ink">Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="vintage-input w-full px-3 py-2.5 text-sm"
          >
            {OPPORTUNITY_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-vintage-ink">Work mode</span>
          <select
            value={workMode}
            onChange={(e) => setWorkMode(e.target.value as OpportunityWorkMode)}
            className="vintage-input w-full px-3 py-2.5 text-sm"
          >
            {WORK_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-vintage-ink">Location</span>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City, country, or Remote"
            className="vintage-input w-full px-3 py-2.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-vintage-ink">Compensation</span>
          <select
            value={compensationType}
            onChange={(e) => setCompensationType(e.target.value as OpportunityCompensation)}
            className="vintage-input w-full px-3 py-2.5 text-sm"
          >
            {COMPENSATION_TYPES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-vintage-ink">
            Pay details (optional)
          </span>
          <input
            value={compensationDetail}
            onChange={(e) => setCompensationDetail(e.target.value)}
            placeholder="e.g. $500 flat, hourly rate, revenue share"
            className="vintage-input w-full px-3 py-2.5 text-sm"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-vintage-ink">
            External apply link (optional)
          </span>
          <input
            type="url"
            value={applicationUrl}
            onChange={(e) => setApplicationUrl(e.target.value)}
            placeholder="https://…"
            className="vintage-input w-full px-3 py-2.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-vintage-ink">
            Expires on (optional)
          </span>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="vintage-input w-full px-3 py-2.5 text-sm"
          />
        </label>
      </div>

      {error && (
        <p className="rounded-lg bg-vintage-rust/10 px-3 py-2 text-sm text-vintage-rust">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="vintage-btn px-6 py-2.5 text-sm disabled:opacity-50"
        >
          {saving ? "Posting…" : "Publish opportunity"}
        </button>
      </div>
    </form>
  );
}
