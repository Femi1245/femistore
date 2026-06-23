import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Opportunity,
  OpportunityCompensation,
  OpportunityType,
  OpportunityWorkMode,
  Profile,
} from "./types";

export const OPPORTUNITY_TYPES: { value: OpportunityType; label: string }[] = [
  { value: "job", label: "Job" },
  { value: "gig", label: "Gig / freelance" },
  { value: "collab", label: "Collaboration" },
  { value: "internship", label: "Internship" },
  { value: "volunteer", label: "Volunteer" },
  { value: "other", label: "Other" },
];

export const OPPORTUNITY_CATEGORIES = [
  "Tech & development",
  "Design & creative",
  "Marketing & sales",
  "Business & operations",
  "Education & tutoring",
  "Events & hospitality",
  "Freelance & gigs",
  "Other",
] as const;

export const WORK_MODES: { value: OpportunityWorkMode; label: string }[] = [
  { value: "remote", label: "Remote" },
  { value: "onsite", label: "On-site" },
  { value: "hybrid", label: "Hybrid" },
];

export const COMPENSATION_TYPES: { value: OpportunityCompensation; label: string }[] = [
  { value: "paid", label: "Paid" },
  { value: "commission", label: "Commission" },
  { value: "negotiable", label: "Negotiable" },
  { value: "unpaid", label: "Unpaid" },
];

export type OpportunityFilters = {
  search?: string;
  type?: OpportunityType | "";
  category?: string;
  workMode?: OpportunityWorkMode | "";
  mine?: boolean;
};

export type CreateOpportunityInput = {
  title: string;
  description: string;
  opportunity_type: OpportunityType;
  category: string;
  location: string;
  work_mode: OpportunityWorkMode;
  compensation_type: OpportunityCompensation;
  compensation_detail: string;
  application_url?: string;
  expires_at?: string | null;
};

function isExpired(opp: Opportunity): boolean {
  if (!opp.expires_at) return false;
  return new Date(opp.expires_at).getTime() < Date.now();
}

export function opportunityTypeLabel(type: OpportunityType): string {
  return OPPORTUNITY_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function workModeLabel(mode: OpportunityWorkMode): string {
  return WORK_MODES.find((m) => m.value === mode)?.label ?? mode;
}

export function compensationLabel(type: OpportunityCompensation): string {
  return COMPENSATION_TYPES.find((c) => c.value === type)?.label ?? type;
}

export function formatOpportunityAge(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(createdAt).toLocaleDateString();
}

export async function loadOpportunities(
  supabase: SupabaseClient,
  filters: OpportunityFilters = {},
  limit = 40,
): Promise<Opportunity[]> {
  let query = supabase
    .from("opportunities")
    .select("*, poster:profiles!opportunities_poster_id_fkey(*)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filters.mine) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    query = query.eq("poster_id", user.id);
  } else {
    query = query.eq("is_active", true);
  }

  if (filters.type) query = query.eq("opportunity_type", filters.type);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.workMode) query = query.eq("work_mode", filters.workMode);

  const { data, error } = await query;
  if (error) {
    if (error.code === "PGRST205") return [];
    throw new Error(error.message);
  }

  let rows = (data ?? []) as Opportunity[];

  if (filters.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    rows = rows.filter(
      (o) =>
        o.title.toLowerCase().includes(q) ||
        o.description.toLowerCase().includes(q) ||
        o.location.toLowerCase().includes(q) ||
        o.category.toLowerCase().includes(q),
    );
  }

  if (!filters.mine) {
    rows = rows.filter((o) => !isExpired(o));
  }

  return rows;
}

export async function loadOpportunityById(
  supabase: SupabaseClient,
  id: string,
): Promise<Opportunity | null> {
  const { data, error } = await supabase
    .from("opportunities")
    .select("*, poster:profiles!opportunities_poster_id_fkey(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    if (error.code === "PGRST205") return null;
    throw new Error(error.message);
  }

  return (data as Opportunity) ?? null;
}

export async function createOpportunity(
  supabase: SupabaseClient,
  userId: string,
  input: CreateOpportunityInput,
): Promise<{ opportunity: Opportunity | null; error?: string }> {
  const { data, error } = await supabase
    .from("opportunities")
    .insert({
      poster_id: userId,
      title: input.title.trim(),
      description: input.description.trim(),
      opportunity_type: input.opportunity_type,
      category: input.category,
      location: input.location.trim(),
      work_mode: input.work_mode,
      compensation_type: input.compensation_type,
      compensation_detail: input.compensation_detail.trim(),
      application_url: input.application_url?.trim() || null,
      expires_at: input.expires_at || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST205") {
      return {
        opportunity: null,
        error: "Run supabase/opportunities-board-schema.sql in Supabase SQL Editor first.",
      };
    }
    return { opportunity: null, error: error.message };
  }

  return { opportunity: data as Opportunity };
}

export async function closeOpportunity(
  supabase: SupabaseClient,
  opportunityId: string,
  userId: string,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("opportunities")
    .update({ is_active: false })
    .eq("id", opportunityId)
    .eq("poster_id", userId);

  if (error) return { error: error.message };
  return {};
}

export function posterDisplayName(poster: Profile | undefined): string {
  if (!poster) return "Someone";
  if (poster.business_enabled && poster.business_name?.trim()) {
    return poster.business_name.trim();
  }
  return poster.display_name;
}
