"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  loadOpportunities,
  OPPORTUNITY_CATEGORIES,
  OPPORTUNITY_TYPES,
  WORK_MODES,
} from "@/lib/opportunities";
import type { Opportunity, OpportunityType, OpportunityWorkMode, Profile } from "@/lib/types";
import { OpportunityCard } from "@/components/opportunities/OpportunityCard";

type Tab = "all" | "mine";

export function OpportunityHub({ currentUser }: { currentUser: Profile }) {
  const [tab, setTab] = useState<Tab>("all");
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<OpportunityType | "">("");
  const [category, setCategory] = useState("");
  const [workMode, setWorkMode] = useState<OpportunityWorkMode | "">("");
  const [schemaMissing, setSchemaMissing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setSchemaMissing(false);
    try {
      const data = await loadOpportunities(createClient(), {
        search: search.trim() || undefined,
        type,
        category: category || undefined,
        workMode,
        mine: tab === "mine",
      });
      setItems(data);
    } catch {
      setSchemaMissing(true);
      setItems([]);
    }
    setLoading(false);
  }, [search, type, category, workMode, tab]);

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div className="space-y-6">
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
              Jobs, gigs, collabs, and internships — posted by people and businesses on
              Zumelia. Find work, hire talent, or team up without leaving the app.
            </p>
          </div>
          <Link
            href="/opportunities/new"
            className="vintage-btn inline-flex shrink-0 items-center justify-center gap-2 px-5 py-2.5 text-sm"
          >
            <Plus className="h-4 w-4" />
            Post opportunity
          </Link>
        </div>

        <div className="mt-5 flex gap-2">
          {(["all", "mine"] as const).map((t) => (
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
              {t === "all" ? "Browse all" : "My posts"}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-vintage-rust" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, skills, location…"
              className="vintage-input w-full py-2.5 pl-10 pr-4 text-sm"
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
            Run <code className="text-xs">supabase/opportunities-board-schema.sql</code> in
            your Supabase SQL Editor to enable the opportunities board.
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
            {tab === "mine" ? "You haven't posted yet" : "No opportunities yet"}
          </p>
          <p className="mt-2 text-sm text-vintage-ink-muted">
            {tab === "mine"
              ? "Post a job, gig, or collab and let the community find you."
              : "Be the first to post — or check back soon."}
          </p>
          <Link
            href="/opportunities/new"
            className="vintage-btn mt-5 inline-flex items-center gap-2 px-5 py-2.5 text-sm"
          >
            <Plus className="h-4 w-4" />
            Post opportunity
          </Link>
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
