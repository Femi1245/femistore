import type { SupabaseClient } from "@supabase/supabase-js";
import { SERVICE_GIG_DESCRIPTION_MAX } from "./content-limits";
import type {
  Opportunity,
  OpportunityAttachment,
  OpportunityCompensation,
  OpportunityListingKind,
  OpportunityMediaType,
  OpportunityType,
  OpportunityWorkMode,
  Profile,
} from "./types";
import { canCreateServiceGigs, getBusinessProfileUrl, hasBusinessProfile } from "./business";

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

export { COMMENT_MAX_LENGTH, SERVICE_GIG_DESCRIPTION_MAX } from "./content-limits";

/** Max files per service gig (images + videos + docs combined). */
export const SERVICE_GIG_MAX_ATTACHMENTS = 6;

export const SERVICE_GIG_FILE_MAX_BYTES = {
  image: 5 * 1024 * 1024,
  video: 25 * 1024 * 1024,
  document: 10 * 1024 * 1024,
} as const;

export const SERVICE_GIG_ACCEPT = {
  image: "image/jpeg,image/png,image/webp,image/gif",
  video: "video/mp4,video/webm,video/quicktime",
  document:
    "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain",
} as const;

export type OpportunityFilters = {
  search?: string;
  type?: OpportunityType | "";
  category?: string;
  workMode?: OpportunityWorkMode | "";
  listingKind?: OpportunityListingKind | "";
  mine?: boolean;
};

export type CreateOpportunityInput = {
  title: string;
  description: string;
  opportunity_type: OpportunityType;
  listing_kind?: OpportunityListingKind;
  service_name?: string;
  category: string;
  location: string;
  work_mode: OpportunityWorkMode;
  compensation_type: OpportunityCompensation;
  compensation_detail: string;
  application_url?: string;
  expires_at?: string | null;
  attachments?: OpportunityAttachment[];
};

export function classifyServiceGigFile(file: File): OpportunityMediaType | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (
    file.type === "application/pdf" ||
    file.type === "application/msword" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.type === "text/plain"
  ) {
    return "document";
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext && ["pdf", "doc", "docx", "txt"].includes(ext)) return "document";
  return null;
}

export function validateServiceGigFile(
  file: File,
): { ok: true; type: OpportunityMediaType } | { ok: false; error: string } {
  const type = classifyServiceGigFile(file);
  if (!type) {
    return {
      ok: false,
      error: `${file.name}: use JPG/PNG/WebP/GIF, MP4/WebM video, or PDF/DOC/DOCX/TXT.`,
    };
  }
  const max = SERVICE_GIG_FILE_MAX_BYTES[type];
  if (file.size > max) {
    const mb = Math.round(max / (1024 * 1024));
    return { ok: false, error: `${file.name} is too large (max ${mb} MB for ${type}s).` };
  }
  return { ok: true, type };
}

export function normalizeOpportunity(row: Opportunity): Opportunity {
  const raw = row.attachments;
  const attachments = Array.isArray(raw)
    ? raw.filter(
        (a): a is OpportunityAttachment =>
          !!a &&
          typeof a === "object" &&
          typeof (a as OpportunityAttachment).url === "string" &&
          ["image", "video", "document"].includes((a as OpportunityAttachment).type),
      )
    : [];
  return {
    ...row,
    listing_kind: row.listing_kind ?? "seeking",
    service_name: row.service_name ?? "",
    attachments,
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isExpired(opp: Opportunity): boolean {
  if (!opp.expires_at) return false;
  return new Date(opp.expires_at).getTime() < Date.now();
}

export function opportunityTypeLabel(type: OpportunityType): string {
  return OPPORTUNITY_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function listingKindLabel(kind: OpportunityListingKind): string {
  return kind === "offering" ? "Service / product" : "Hiring / need";
}

/** Split business_services field into pickable service lines. */
export function parseBusinessServices(services: string | null | undefined): string[] {
  if (!services?.trim()) return [];
  return [
    ...new Set(
      services
        .split(/\n|;/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 2),
    ),
  ];
}

export function defaultServiceGigCategory(profile: Profile): string {
  const biz = profile.business_category?.trim();
  if (!biz) return OPPORTUNITY_CATEGORIES[0];
  const match = OPPORTUNITY_CATEGORIES.find(
    (c) => c.toLowerCase().includes(biz.toLowerCase()) || biz.toLowerCase().includes(c.toLowerCase()),
  );
  return match ?? OPPORTUNITY_CATEGORIES[0];
}

export function buildServiceGigDraft(
  profile: Profile,
  serviceName: string,
): { title: string; description: string; category: string } {
  const business = profile.business_name?.trim() || profile.display_name;
  const title = `${serviceName} — ${business}`;
  const parts = [
    profile.business_tagline?.trim(),
    profile.business_description?.trim(),
    profile.business_services?.trim()
      ? `All services:\n${profile.business_services.trim()}`
      : null,
  ].filter(Boolean);
  return {
    title: title.slice(0, 120),
    description: (parts.join("\n\n") || `Offering ${serviceName}. Message me for details.`).slice(
      0,
      SERVICE_GIG_DESCRIPTION_MAX,
    ),
    category: defaultServiceGigCategory(profile),
  };
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
  if (filters.listingKind) query = query.eq("listing_kind", filters.listingKind);

  const { data, error } = await query;
  if (error) {
    if (error.code === "PGRST205") return [];
    throw new Error(error.message);
  }

  let rows = (data ?? []).map((row) => normalizeOpportunity(row as Opportunity));

  if (filters.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    rows = rows.filter(
      (o) =>
        o.title.toLowerCase().includes(q) ||
        o.description.toLowerCase().includes(q) ||
        o.location.toLowerCase().includes(q) ||
        o.category.toLowerCase().includes(q) ||
        o.service_name.toLowerCase().includes(q),
    );
  }

  if (!filters.mine) {
    rows = rows.filter((o) => !isExpired(o));
  }

  return rows;
}

export async function loadOpportunitiesByPoster(
  supabase: SupabaseClient,
  posterId: string,
  options: {
    listingKind?: OpportunityListingKind;
    includeInactive?: boolean;
    limit?: number;
  } = {},
): Promise<Opportunity[]> {
  let query = supabase
    .from("opportunities")
    .select("*, poster:profiles!opportunities_poster_id_fkey(*)")
    .eq("poster_id", posterId)
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 40);

  if (options.listingKind) query = query.eq("listing_kind", options.listingKind);
  if (!options.includeInactive) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) {
    if (error.code === "PGRST205") return [];
    throw new Error(error.message);
  }

  let rows = (data ?? []).map((row) => normalizeOpportunity(row as Opportunity));

  if (!options.includeInactive) {
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

  return (data as Opportunity) ? normalizeOpportunity(data as Opportunity) : null;
}

export async function createOpportunity(
  supabase: SupabaseClient,
  userId: string,
  input: CreateOpportunityInput,
): Promise<{ opportunity: Opportunity | null; error?: string }> {
  if (input.listing_kind === "offering" && input.description.length > SERVICE_GIG_DESCRIPTION_MAX) {
    return {
      opportunity: null,
      error: `Description must be ${SERVICE_GIG_DESCRIPTION_MAX} characters or less.`,
    };
  }

  if (input.listing_kind === "offering") {
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!profileRow || !canCreateServiceGigs(profileRow as Profile)) {
      return {
        opportunity: null,
        error: hasBusinessProfile(profileRow as Profile)
          ? "Switch to business mode on your storefront to list services."
          : "Set up your business profile to list services.",
      };
    }
  }

  const { data, error } = await supabase
    .from("opportunities")
    .insert({
      poster_id: userId,
      title: input.title.trim(),
      description: input.description.trim(),
      opportunity_type: input.opportunity_type,
      listing_kind: input.listing_kind ?? "seeking",
      service_name: (input.service_name ?? "").trim(),
      attachments: input.attachments ?? [],
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
    if (error.message?.includes("listing_kind") || error.message?.includes("attachments")) {
      return {
        opportunity: null,
        error: "Run supabase/opportunities-service-gigs-schema.sql in Supabase SQL Editor first.",
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

export function posterStorefrontUrl(poster: Profile | undefined): string | null {
  if (!poster || !hasBusinessProfile(poster)) return null;
  return getBusinessProfileUrl(poster.username);
}
