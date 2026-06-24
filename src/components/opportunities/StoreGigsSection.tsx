"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Sparkles, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  canCreateServiceGigs,
  getBusinessProfileUrl,
  hasBusinessProfile,
} from "@/lib/business";
import { loadOpportunitiesByPoster } from "@/lib/opportunities";
import type { Opportunity, Profile } from "@/lib/types";
import { OpportunityCard } from "@/components/opportunities/OpportunityCard";
import { SellerModePrompt } from "@/components/business/SellerModeGate";

export function StoreGigsSection({
  profile,
  currentUser,
  variant = "store",
}: {
  profile: Profile;
  currentUser: Profile;
  variant?: "store" | "profile";
}) {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const isOwn = profile.id === currentUser.id;
  const hasStore = hasBusinessProfile(profile);
  const canSell = canCreateServiceGigs(currentUser);
  const storeHref = getBusinessProfileUrl(profile.username);
  const listServiceHref = canSell
    ? "/opportunities/new/service"
    : hasStore
      ? `${storeHref}?seller=1`
      : "/profile/business/setup";

  const refresh = useCallback(async () => {
    setLoading(true);
    setSchemaMissing(false);
    try {
      const data = await loadOpportunitiesByPoster(createClient(), profile.id, {
        listingKind: "offering",
        includeInactive: isOwn,
      });
      setItems(data);
    } catch {
      setSchemaMissing(true);
      setItems([]);
    }
    setLoading(false);
  }, [profile.id, isOwn]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const title =
    variant === "store"
      ? isOwn
        ? "Your services & products"
        : "Services & products"
      : "Services & products";

  const subtitle =
    variant === "store"
      ? isOwn
        ? "Gigs you publish appear here and on the opportunities board."
        : "Products and services listed by this business."
      : isOwn
        ? "Your listings also appear on your storefront when you have one."
        : "Products and services offered on Zumelia.";

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vintage-ink-muted">
            {variant === "store" ? "Storefront · Listings" : "Marketplace"}
          </p>
          <h2 className="font-display text-xl font-semibold text-vintage-ink">{title}</h2>
          <p className="mt-1 text-sm text-vintage-ink-muted">{subtitle}</p>
        </div>
        {isOwn && (
          <div className="flex flex-wrap gap-2">
            <Link
              href={listServiceHref}
              className="vintage-btn inline-flex items-center gap-2 px-4 py-2 text-sm"
            >
              <Store className="h-4 w-4" />
              List a service
            </Link>
            <Link
              href="/opportunities"
              className="vintage-btn-outline inline-flex items-center gap-2 px-4 py-2 text-sm"
            >
              <Sparkles className="h-4 w-4" />
              Browse marketplace
            </Link>
          </div>
        )}
      </div>

      {isOwn && !canSell && <SellerModePrompt user={currentUser} />}

      {schemaMissing && (
        <div className="vintage-card border-vintage-rust/30 bg-vintage-rust/5 p-4 text-sm text-vintage-ink">
          <p className="font-semibold">Database setup needed</p>
          <p className="mt-1 text-vintage-ink-muted">
            Run{" "}
            <code className="rounded bg-vintage-paper-dark px-1 py-0.5 text-xs">
              supabase/opportunities-service-gigs-schema.sql
            </code>{" "}
            in Supabase to enable service listings.
          </p>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="vintage-card h-44 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="vintage-card p-8 text-center">
          <p className="font-display text-lg font-semibold text-vintage-ink">
            {isOwn ? "No services listed yet" : "No services listed"}
          </p>
          <p className="mt-2 text-sm text-vintage-ink-muted">
            {isOwn
              ? hasStore
                ? "Publish your first product or service — it will show on your store and profile."
                : "List what you offer. Set up a business profile to unlock your storefront."
              : "Check back later for new offers."}
          </p>
          {isOwn && (
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link
                href={listServiceHref}
                className="vintage-btn inline-flex items-center gap-2 px-5 py-2.5 text-sm"
              >
                <Store className="h-4 w-4" />
                List your first service
              </Link>
              {!hasStore && (
                <Link
                  href="/profile/business/setup"
                  className="vintage-btn-outline inline-flex items-center gap-2 px-5 py-2.5 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Set up storefront
                </Link>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((opp) => (
            <OpportunityCard key={opp.id} opportunity={opp} />
          ))}
        </div>
      )}

      {variant === "profile" && isOwn && hasStore && items.length > 0 && (
        <p className="text-center text-sm text-vintage-ink-muted">
          Also on your{" "}
          <Link href={storeHref} className="font-semibold text-vintage-rust hover:underline">
            storefront
          </Link>
        </p>
      )}
    </section>
  );
}
