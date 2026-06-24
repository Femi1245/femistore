"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  buildServiceGigDraft,
  COMPENSATION_TYPES,
  createOpportunity,
  defaultServiceGigCategory,
  OPPORTUNITY_CATEGORIES,
  parseBusinessServices,
  SERVICE_GIG_DESCRIPTION_MAX,
  WORK_MODES,
  type CreateOpportunityInput,
} from "@/lib/opportunities";
import { ServiceGigMediaPicker } from "@/components/opportunities/ServiceGigMediaPicker";
import {
  getBusinessProfileUrl,
  hasBusinessProfile,
} from "@/lib/business";
import type {
  OpportunityAttachment,
  OpportunityCompensation,
  OpportunityWorkMode,
  Profile,
} from "@/lib/types";

export function CreateServiceGigForm({ user }: { user: Profile }) {
  const router = useRouter();
  const serviceOptions = useMemo(
    () => parseBusinessServices(user.business_services),
    [user.business_services],
  );
  const hasBusiness = hasBusinessProfile(user);

  const [serviceName, setServiceName] = useState(serviceOptions[0] ?? "");
  const [customService, setCustomService] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(defaultServiceGigCategory(user));
  const [location, setLocation] = useState(
    user.business_location ?? user.country ?? "",
  );
  const [workMode, setWorkMode] = useState<OpportunityWorkMode>("remote");
  const [compensationType, setCompensationType] =
    useState<OpportunityCompensation>("paid");
  const [compensationDetail, setCompensationDetail] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [attachments, setAttachments] = useState<OpportunityAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const descriptionChars = description.length;

  const resolvedService =
    serviceName === "__custom" ? customService.trim() : serviceName.trim();

  function applyServiceTemplate(name: string) {
    if (!name.trim()) return;
    const draft = buildServiceGigDraft(user, name.trim());
    setTitle(draft.title);
    setDescription(draft.description.slice(0, SERVICE_GIG_DESCRIPTION_MAX));
    setCategory(draft.category);
  }

  function handleServicePick(name: string) {
    setServiceName(name);
    if (name && name !== "__custom") {
      applyServiceTemplate(name);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (uploadingMedia) {
      setError("Wait for file uploads to finish.");
      return;
    }
    if (!resolvedService) {
      setError("Enter the product or service you're offering.");
      return;
    }
    if (!title.trim() || title.trim().length < 3) {
      setError("Add a clear title for your gig.");
      return;
    }
    if (description.trim().length < 10) {
      setError("Add a short description (at least 10 characters).");
      return;
    }
    if (description.length > SERVICE_GIG_DESCRIPTION_MAX) {
      setError(`Description must be ${SERVICE_GIG_DESCRIPTION_MAX} characters or less.`);
      return;
    }

    setSaving(true);

    const storefrontUrl =
      hasBusiness && typeof window !== "undefined"
        ? `${window.location.origin}${getBusinessProfileUrl(user.username)}`
        : undefined;

    const input: CreateOpportunityInput = {
      title: title.trim(),
      description: description.trim(),
      opportunity_type: "gig",
      listing_kind: "offering",
      service_name: resolvedService,
      category,
      location: location.trim(),
      work_mode: workMode,
      compensation_type: compensationType,
      compensation_detail: compensationDetail.trim(),
      application_url: storefrontUrl,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      attachments,
    };

    const { opportunity, error: err } = await createOpportunity(
      createClient(),
      user.id,
      input,
    );
    setSaving(false);

    if (err || !opportunity) {
      setError(err ?? "Could not publish your service gig.");
      return;
    }

    if (hasBusinessProfile(user)) {
      router.push(getBusinessProfileUrl(user.username));
    } else {
      router.push(`/profile/${user.username}`);
    }
    router.refresh();
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="vintage-card space-y-5 p-5 sm:p-6">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Store className="h-5 w-5 text-vintage-rust" />
          <h1 className="font-display text-xl font-bold text-vintage-ink">
            List a product or service
          </h1>
        </div>
        <p className="text-sm text-vintage-ink-muted">
          Publish to your store and profile — customers can message you or visit your
          storefront.
        </p>
      </div>

      {!hasBusiness && (
        <div className="rounded-lg border border-vintage-mustard/40 bg-vintage-mustard/10 px-4 py-3 text-sm text-vintage-ink">
          <p className="font-semibold">Tip: set up your business profile</p>
          <p className="mt-1 text-vintage-ink-muted">
            Add your services once in your storefront and reuse them here.
          </p>
          <Link
            href="/profile/business/setup"
            className="mt-2 inline-flex items-center gap-1 font-semibold text-vintage-rust hover:underline"
          >
            <Briefcase className="h-4 w-4" />
            Set up business profile
          </Link>
        </div>
      )}

      <div className="space-y-3">
        <span className="block text-sm font-semibold text-vintage-ink">
          What are you offering?
        </span>
        {serviceOptions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {serviceOptions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleServicePick(s)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  serviceName === s
                    ? "border-vintage-rust bg-vintage-rust/15 text-vintage-rust"
                    : "border-vintage-border text-vintage-ink-muted hover:border-vintage-rust/40"
                }`}
              >
                {s}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleServicePick("__custom")}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                serviceName === "__custom"
                  ? "border-vintage-rust bg-vintage-rust/15 text-vintage-rust"
                  : "border-vintage-border text-vintage-ink-muted hover:border-vintage-rust/40"
              }`}
            >
              Other…
            </button>
          </div>
        ) : null}
        {(serviceName === "__custom" || serviceOptions.length === 0) && (
          <input
            required
            value={customService}
            onChange={(e) => {
              setCustomService(e.target.value);
              if (e.target.value.trim().length >= 2) {
                applyServiceTemplate(e.target.value);
              }
            }}
            placeholder="e.g. Logo design, Hair braiding, Web development"
            className="vintage-input w-full px-3 py-2.5 text-sm"
          />
        )}
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-vintage-ink">Gig title</span>
        <input
          required
          minLength={3}
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Professional logo design — Fast turnaround"
          className="vintage-input w-full px-3 py-2.5 text-sm"
        />
      </label>

      <label className="block">
        <span className="mb-1 flex items-center justify-between gap-2 text-sm font-semibold text-vintage-ink">
          <span>Description</span>
          <span
            className={`text-xs font-normal ${
              descriptionChars > SERVICE_GIG_DESCRIPTION_MAX
                ? "text-vintage-rust"
                : "text-vintage-ink-muted"
            }`}
          >
            {descriptionChars}/{SERVICE_GIG_DESCRIPTION_MAX}
          </span>
        </span>
        <textarea
          required
          minLength={10}
          maxLength={SERVICE_GIG_DESCRIPTION_MAX}
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's included, delivery time, who it's for, how to book…"
          className="vintage-input w-full resize-y px-3 py-2.5 text-sm"
        />
        <p className="mt-1 text-xs text-vintage-ink-muted">
          Keep it short and clear — {SERVICE_GIG_DESCRIPTION_MAX} characters max.
        </p>
      </label>

      <ServiceGigMediaPicker
        userId={user.id}
        attachments={attachments}
        onChange={setAttachments}
        onUploadingChange={setUploadingMedia}
        disabled={saving}
      />

      <div className="grid gap-4 sm:grid-cols-2">
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
          <span className="mb-1 block text-sm font-semibold text-vintage-ink">Pricing</span>
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
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-semibold text-vintage-ink">
            Price / rate (optional)
          </span>
          <input
            value={compensationDetail}
            onChange={(e) => setCompensationDetail(e.target.value)}
            placeholder="e.g. From $50, ₦15,000 per session, 10% commission"
            className="vintage-input w-full px-3 py-2.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-vintage-ink">
            Listing expires (optional)
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
          disabled={saving || uploadingMedia}
          className="vintage-btn px-6 py-2.5 text-sm disabled:opacity-50"
        >
          {saving ? "Publishing…" : "Publish service gig"}
        </button>
        <Link
          href="/opportunities/new"
          className="vintage-btn-outline inline-flex items-center px-5 py-2.5 text-sm"
        >
          Post a hiring need instead
        </Link>
      </div>
    </form>
  );
}
