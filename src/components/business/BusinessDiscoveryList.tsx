"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Briefcase } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BUSINESS_CATEGORIES, loadDiscoverableBusinesses, loadFeaturedBusinesses } from "@/lib/business";
import type { Profile } from "@/lib/types";
import { BusinessDiscoveryCard } from "@/components/business/BusinessDiscoveryCard";
import { BusinessMarketplaceFeed } from "@/components/business/BusinessMarketplaceFeed";
import { SearchWithSuggestions } from "@/components/search/SearchWithSuggestions";

export function BusinessDiscoveryList({ currentUser }: { currentUser: Profile }) {
  const [businesses, setBusinesses] = useState<Profile[]>([]);
  const [featured, setFeatured] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [data, featuredData] = await Promise.all([
      loadDiscoverableBusinesses(supabase, {
        search: search.trim() || undefined,
        category: category || undefined,
        location: location.trim() || undefined,
      }),
      loadFeaturedBusinesses(supabase, 6),
    ]);
    setBusinesses(data.filter((b) => b.id !== currentUser.id));
    setFeatured(featuredData.filter((b) => b.id !== currentUser.id));
    setLoading(false);
  }, [search, category, location, currentUser.id]);

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div className="space-y-8">
      <BusinessMarketplaceFeed
        currentUser={currentUser}
        title="Latest listings"
        description="Products and offers posted by businesses — tap a listing to visit the storefront."
      />

      <div className="space-y-6">
      <div className="vintage-card p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-vintage-rust" />
          <h1 className="font-display text-xl font-bold text-vintage-ink">Discover businesses</h1>
        </div>
        <p className="mb-4 text-sm text-vintage-ink-muted">
          Shop from businesses on Zumelia — browse listings, offers, and storefronts.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <SearchWithSuggestions
              scope="businesses"
              value={search}
              onChange={setSearch}
              excludeUserId={currentUser.id}
              placeholder="Search businesses…"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="vintage-input w-full px-3 py-2.5 text-sm"
          >
            <option value="">All categories</option>
            {BUSINESS_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location…"
            className="vintage-input w-full px-3 py-2.5 text-sm"
          />
        </div>
      </div>

      {!loading && featured.length > 0 && !search && !category && !location && (
        <div>
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-vintage-ink-muted">
            Featured businesses
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((profile) => (
              <BusinessDiscoveryCard key={`featured-${profile.id}`} profile={profile} />
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="vintage-card h-64 animate-pulse bg-vintage-paper-dark/40" />
          ))}
        </div>
      ) : businesses.length === 0 ? (
        <div className="vintage-card flex flex-col items-center gap-3 px-6 py-16 text-center">
          <Briefcase className="h-12 w-12 text-vintage-border" />
          <p className="text-sm text-vintage-ink-muted">
            No businesses match your search yet. Try different filters or create your own business profile.
          </p>
          <Link href="/profile/business/setup" className="vintage-btn-outline px-4 py-2 text-sm">
            Create business profile
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((profile) => (
            <BusinessDiscoveryCard key={profile.id} profile={profile} />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
