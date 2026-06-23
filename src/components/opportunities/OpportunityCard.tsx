"use client";

import Link from "next/link";
import {
  Briefcase,
  Clock,
  MapPin,
  Wifi,
} from "lucide-react";
import type { Opportunity } from "@/lib/types";
import {
  compensationLabel,
  formatOpportunityAge,
  opportunityTypeLabel,
  posterDisplayName,
  workModeLabel,
} from "@/lib/opportunities";
import { Avatar } from "@/components/Avatar";

export function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  const poster = opportunity.poster;

  return (
    <Link
      href={`/opportunities/${opportunity.id}`}
      className="vintage-card block p-4 transition hover:-translate-y-0.5 hover:shadow-md sm:p-5"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-vintage-rust/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-vintage-rust">
          {opportunityTypeLabel(opportunity.opportunity_type)}
        </span>
        <span className="rounded-full bg-vintage-paper-dark px-2.5 py-0.5 text-xs font-medium text-vintage-ink-muted">
          {opportunity.category}
        </span>
        {!opportunity.is_active && (
          <span className="rounded-full bg-vintage-ink/10 px-2.5 py-0.5 text-xs font-semibold text-vintage-ink-muted">
            Closed
          </span>
        )}
      </div>

      <h3 className="font-display text-lg font-bold text-vintage-ink line-clamp-2">
        {opportunity.title}
      </h3>

      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-vintage-ink-muted">
        {opportunity.description}
      </p>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-vintage-ink-muted">
        <span className="inline-flex items-center gap-1">
          <Wifi className="h-3.5 w-3.5" />
          {workModeLabel(opportunity.work_mode)}
        </span>
        {opportunity.location && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {opportunity.location}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <Briefcase className="h-3.5 w-3.5" />
          {compensationLabel(opportunity.compensation_type)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {formatOpportunityAge(opportunity.created_at)}
        </span>
      </div>

      {poster && (
        <div className="mt-4 flex items-center gap-2 border-t border-vintage-border pt-3">
          <Avatar
            name={posterDisplayName(poster)}
            avatarUrl={poster.avatar_url}
            size="sm"
          />
          <span className="text-sm font-medium text-vintage-ink">
            {posterDisplayName(poster)}
          </span>
        </div>
      )}
    </Link>
  );
}
