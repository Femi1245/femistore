"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Sparkles, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  canCreateServiceGigs,
  getBusinessProfileUrl,
  hasBusinessProfile,
} from "@/lib/business";
import {
  loadOpportunities,
  OPPORTUNITY_CATEGORIES,
  OPPORTUNITY_TYPES,
  WORK_MODES,
} from "@/lib/opportunities";
import type {
  Opportunity,
  OpportunityListingKind,
  OpportunityType,
  OpportunityWorkMode,
  Profile,
} from "@/lib/types";
import { OpportunityCard } from "@/components/opportunities/OpportunityCard";
import { SearchWithSuggestions } from "@/components/search/SearchWithSuggestions";
import { SectionTipBanner } from "@/components/layout/SectionTipBanner";

type Tab = "all" | "services" | "hiring" | "mine";

export function OpportunityHub({
  currentUser,
  initialOpportunities,
}: {
  currentUser: Profile;
  initialOpportunities?: Opportunity[];
}) {
  const [tab, setTab] = useState<Tab>("all");
  const [items, setItems] = useState<Opportunity[]>(initialOpportunities ?? []);
  const [loading, setLoading] = useState(initialOpportunities === undefined);
  const usedInitial = useRef(initialOpportunities !== undefined);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<OpportunityType | "">("");
  const [category, setCategory] = useState("");
  const [workMode, setWorkMode] = useState<OpportunityWorkMode | "">("");
  const [schemaMissing, setSchemaMissing] = useState(false);

  const listingKind: OpportunityListingKind | "" =
    tab === "services" ? "offering" : tab === "hiring" ? "seeking" : "";

  const canSell = canCreateServiceGigs(currentUser);
  const storeHref = getBusinessProfileUrl(currentUser.username);
  const listServiceHref = canSell
    ? "/opportunities/new/service"
    : hasBusinessProfile(currentUser)
      ? `${storeHref}?seller=1`
      : "/profile/business/setup";

  const load = useCallback(async () => {
    setLoading(true);
    setSchemaMissing(false);
    try {
      const data = await loadOpportunities(createClient(), {
        search: search.trim() || undefined,
        type,
        category: category || undefined,
        workMode,
        listingKind,
        mine: tab === "mine",
      });
      setItems(data);
    } catch {
      setSchemaMissing(true);
      setItems([]);
    }
    setLoading(false);
  }, [search, type, category, workMode, listingKind, tab]);

  useEffect(() => {
    if (
      usedInitial.current &&
      initialOpportunities &&
      tab === "all" &&
      !search &&
      !type &&
      !category &&
      !workMode
    ) {
      usedInitial.current = false;
      setItems(initialOpportunities);
      setLoading(false);
      return;
    }
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [load, initialOpportunities, tab, search, type, category, workMode]);

  return (
    <div className="space-y-6">
      <SectionTipBanner section="opportunities" />

      <div className="vintage-card p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-vintage-rust" />
              <h1 className="font-display text-2xl font-bold text-vintage-ink">
                Opportunities
              </h1>
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-vintage-ink-muted">
              Hire talent, find gigs, or list your own products and services.
              {hasBusinessProfile(currentUser) && (
                <>
                  {" "}
                  Your listings also appear on{" "}
                  <Link
                    href={getBusinessProfileUrl(currentUser.username)}
                    className="font-semibold text-vintage-rust hover:underline"
                  >
                    your storefront
                  </Link>
                  .
                </>
              )}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <Link
              href={listServiceHref}
              className="vintage-btn inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm"
            >
              <Store className="h-4 w-4" />
              List your service
            </Link>
            <Link
              href="/opportunities/new"
              className="vintage-btn-outline inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm"
            >
              <Plus className="h-4 w-4" />
              Post a hiring need
            </Link>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {(
            [
              ["all", "Browse all"],
              ["services", "Services & products"],
              ["hiring", "Hiring & gigs"],
              ["mine", "My posts"],
            ] as const
          ).map(([t, label]) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                tab === t
                  ? "bg-vintage-rust/15 text-vintage-rust"
                  : "text-vintage-ink-muted hover:bg-vintage-paper-dark"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <SearchWithSuggestions
              scope="opportunities"
              value={search}
              onChange={setSearch}
              placeholder="Search title, service, skills, location…"
            />
          </div>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as OpportunityType | "")}
            className="vintage-input w-full px-3 py-2.5 text-sm"
          >
            <option value="">All types</option>
            {OPPORTUNITY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="vintage-input w-full px-3 py-2.5 text-sm"
          >
            <option value="">All categories</option>
            {OPPORTUNITY_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={workMode}
            onChange={(e) => setWorkMode(e.target.value as OpportunityWorkMode | "")}
            className="vintage-input w-full px-3 py-2.5 text-sm sm:col-span-2 lg:col-span-1"
          >
            <option value="">Any work mode</option>
            {WORK_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {schemaMissing && (
        <div className="vintage-card border-vintage-rust/30 bg-vintage-rust/5 p-4 text-sm text-vintage-ink">
          <p className="font-semibold">Database setup needed</p>
          <p className="mt-1 text-vintage-ink-muted">
            Run <code className="text-xs">supabase/opportunities-board-schema.sql</code> and{" "}
            <code className="text-xs">supabase/opportunities-service-gigs-schema.sql</code> in
            your Supabase SQL Editor.
          </p>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="vintage-card h-48 animate-pulse p-5" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="vintage-card p-10 text-center">
          <p className="font-display text-lg font-semibold text-vintage-ink">
            {tab === "mine"
              ? "You haven't posted yet"
              : tab === "services"
                ? "No services listed yet"
                : tab === "hiring"
                  ? "No hiring posts yet"
                  : "No opportunities yet"}
          </p>
          <p className="mt-2 text-sm text-vintage-ink-muted">
            {tab === "mine"
              ? "List a service or post what you're looking for."
              : tab === "services"
                ? "Be the first to list your product or service."
                : "Be the first to post — or check back soon."}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href={listServiceHref}
              className="vintage-btn inline-flex items-center gap-2 px-5 py-2.5 text-sm"
            >
              <Store className="h-4 w-4" />
              List your service
            </Link>
            <Link
              href="/opportunities/new"
              className="vintage-btn-outline inline-flex items-center gap-2 px-5 py-2.5 text-sm"
            >
              <Plus className="h-4 w-4" />
              Post hiring need
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((opp) => (
            <OpportunityCard key={opp.id} opportunity={opp} />
          ))}
        </div>
      )}
    </div>
  );
}
