"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Clock,
  ExternalLink,
  MapPin,
  MessageCircle,
  Wifi,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { findOrCreateConversation } from "@/lib/chat";
import {
  closeOpportunity,
  compensationLabel,
  formatOpportunityAge,
  listingKindLabel,
  opportunityTypeLabel,
  posterDisplayName,
  posterStorefrontUrl,
  workModeLabel,
} from "@/lib/opportunities";
import type { Opportunity, Profile } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { OpportunityAttachments } from "@/components/opportunities/OpportunityAttachments";
import { getBusinessProfileUrl, getPersonalProfileUrl, hasBusinessProfile } from "@/lib/business";

export function OpportunityDetailView({
  opportunity,
  currentUser,
}: {
  opportunity: Opportunity;
  currentUser: Profile;
}) {
  const router = useRouter();
  const poster = opportunity.poster;
  const isOwner = opportunity.poster_id === currentUser.id;
  const [applying, setApplying] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profileHref = poster
    ? poster.business_enabled && poster.business_name
      ? getBusinessProfileUrl(poster.username)
      : getPersonalProfileUrl(poster.username)
    : "#";
  const storefrontUrl = posterStorefrontUrl(poster);
  const isOffering = opportunity.listing_kind === "offering";
  const backHref =
    isOwner && isOffering && hasBusinessProfile(currentUser)
      ? getBusinessProfileUrl(currentUser.username)
      : "/opportunities";
  const backLabel =
    isOwner && isOffering && hasBusinessProfile(currentUser)
      ? "Back to my store"
      : "All opportunities";

  async function handleApply() {
    if (!poster || isOwner) return;
    setApplying(true);
    setError(null);

    const { convId, error: convError } = await findOrCreateConversation(
      createClient(),
      currentUser.id,
      poster.id,
      {
        businessInquiry: isOffering && hasBusinessProfile(poster),
        requestPreview: isOffering
          ? `Inquiry about ${opportunity.service_name || opportunity.title}`
          : `Inquiry about ${opportunity.title}`,
      },
    );
    setApplying(false);

    if (convError) {
      setError(convError);
      return;
    }

    if (convId) {
      const intro = isOffering
        ? `Hi! I'm interested in your service "${opportunity.service_name || opportunity.title}" on Zumelia.`
        : `Hi! I'm interested in your opportunity "${opportunity.title}" on Zumelia.`;
      await createClient().from("messages").insert({
        conversation_id: convId,
        sender_id: currentUser.id,
        content: intro,
      });
      if (isOffering && hasBusinessProfile(poster) && poster.business_auto_reply_enabled) {
        void fetch("/api/business/auto-reply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: convId,
            message: intro,
            businessUserId: poster.id,
          }),
        });
      }
      router.push("/chat");
    }
  }

  async function handleClose() {
    setClosing(true);
    const { error: closeError } = await closeOpportunity(
      createClient(),
      opportunity.id,
      currentUser.id,
    );
    setClosing(false);
    if (closeError) {
      setError(closeError);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm font-medium text-vintage-ink-muted hover:text-vintage-rust"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      <article className="vintage-card p-5 sm:p-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
              isOffering
                ? "bg-vintage-olive/15 text-vintage-olive"
                : "bg-vintage-rust/10 text-vintage-rust"
            }`}
          >
            {listingKindLabel(opportunity.listing_kind ?? "seeking")}
          </span>
          <span className="rounded-full bg-vintage-rust/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-vintage-rust">
            {opportunityTypeLabel(opportunity.opportunity_type)}
          </span>
          <span className="rounded-full bg-vintage-paper-dark px-3 py-1 text-xs font-medium text-vintage-ink-muted">
            {opportunity.category}
          </span>
          {!opportunity.is_active && (
            <span className="rounded-full bg-vintage-ink/10 px-3 py-1 text-xs font-semibold text-vintage-ink-muted">
              Closed
            </span>
          )}
        </div>

        <h1 className="font-display text-2xl font-bold text-vintage-ink sm:text-3xl">
          {opportunity.title}
        </h1>
        {opportunity.service_name && (
          <p className="mt-2 text-base font-semibold text-vintage-rust">
            {opportunity.service_name}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-vintage-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <Wifi className="h-4 w-4" />
            {workModeLabel(opportunity.work_mode)}
          </span>
          {opportunity.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {opportunity.location}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Briefcase className="h-4 w-4" />
            {compensationLabel(opportunity.compensation_type)}
            {opportunity.compensation_detail
              ? ` · ${opportunity.compensation_detail}`
              : ""}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            Posted {formatOpportunityAge(opportunity.created_at)}
          </span>
        </div>

        {poster && (
          <Link
            href={profileHref}
            className="mt-6 flex items-center gap-3 rounded-lg border border-vintage-border p-3 transition hover:bg-vintage-paper-dark"
          >
            <Avatar
              name={posterDisplayName(poster)}
              avatarUrl={poster.avatar_url}
              size="md"
            />
            <div>
              <p className="font-semibold text-vintage-ink">{posterDisplayName(poster)}</p>
              <p className="text-sm text-vintage-ink-muted">@{poster.username}</p>
            </div>
          </Link>
        )}

        <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-vintage-ink">
          {opportunity.description}
        </div>

        <OpportunityAttachments attachments={opportunity.attachments ?? []} />

        {error && (
          <p className="mt-4 rounded-lg bg-vintage-rust/10 px-3 py-2 text-sm text-vintage-rust">
            {error}
          </p>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          {!isOwner && opportunity.is_active && (
            <button
              type="button"
              onClick={() => void handleApply()}
              disabled={applying}
              className="vintage-btn inline-flex items-center gap-2 px-5 py-2.5 text-sm disabled:opacity-50"
            >
              <MessageCircle className="h-4 w-4" />
              {applying
                ? "Opening chat…"
                : isOffering
                  ? "Message seller"
                  : "Apply via message"}
            </button>
          )}
          {storefrontUrl && isOffering && (
            <Link
              href={storefrontUrl}
              className="vintage-btn-outline inline-flex items-center gap-2 px-5 py-2.5 text-sm"
            >
              <ExternalLink className="h-4 w-4" />
              View storefront
            </Link>
          )}
          {opportunity.application_url && (
            <a
              href={opportunity.application_url}
              target="_blank"
              rel="noopener noreferrer"
              className="vintage-btn-outline inline-flex items-center gap-2 px-5 py-2.5 text-sm"
            >
              <ExternalLink className="h-4 w-4" />
              Apply externally
            </a>
          )}
          {isOwner && opportunity.is_active && (
            <button
              type="button"
              onClick={() => void handleClose()}
              disabled={closing}
              className="rounded-lg border border-vintage-border px-5 py-2.5 text-sm font-semibold text-vintage-ink-muted transition hover:bg-vintage-paper-dark disabled:opacity-50"
            >
              {closing ? "Closing…" : "Mark as filled / close"}
            </button>
          )}
        </div>
      </article>
    </div>
  );
}
