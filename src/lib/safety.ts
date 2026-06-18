import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentReport, ReportTargetType } from "./types";

export const REPORT_REASONS = [
  "Spam",
  "Harassment",
  "Hate speech",
  "Impersonation",
  "Scam or fraud",
  "Violence",
  "Sexual content",
  "Other",
] as const;

export async function isBlocked(
  supabase: SupabaseClient,
  userId: string,
  otherId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("user_blocks")
    .select("blocker_id")
    .or(
      `and(blocker_id.eq.${userId},blocked_id.eq.${otherId}),and(blocker_id.eq.${otherId},blocked_id.eq.${userId})`,
    )
    .limit(1);

  return (data?.length ?? 0) > 0;
}

export async function loadBlockedIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<Set<string>> {
  const { data } = await supabase
    .from("user_blocks")
    .select("blocked_id")
    .eq("blocker_id", userId);

  return new Set((data ?? []).map((r) => r.blocked_id as string));
}

export async function loadMutedIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<Set<string>> {
  const { data } = await supabase
    .from("user_mutes")
    .select("muted_id")
    .eq("muter_id", userId);

  return new Set((data ?? []).map((r) => r.muted_id as string));
}

export async function blockUser(
  supabase: SupabaseClient,
  blockerId: string,
  blockedId: string,
): Promise<{ error?: string }> {
  if (blockerId === blockedId) return { error: "You cannot block yourself." };

  const { error } = await supabase.from("user_blocks").upsert({
    blocker_id: blockerId,
    blocked_id: blockedId,
  });

  if (error) return { error: error.message };
  return {};
}

export async function unblockUser(
  supabase: SupabaseClient,
  blockerId: string,
  blockedId: string,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);

  if (error) return { error: error.message };
  return {};
}

export async function muteUser(
  supabase: SupabaseClient,
  muterId: string,
  mutedId: string,
): Promise<{ error?: string }> {
  if (muterId === mutedId) return { error: "You cannot mute yourself." };

  const { error } = await supabase.from("user_mutes").upsert({
    muter_id: muterId,
    muted_id: mutedId,
  });

  if (error) return { error: error.message };
  return {};
}

export async function unmuteUser(
  supabase: SupabaseClient,
  muterId: string,
  mutedId: string,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("user_mutes")
    .delete()
    .eq("muter_id", muterId)
    .eq("muted_id", mutedId);

  if (error) return { error: error.message };
  return {};
}

export async function submitReport(
  supabase: SupabaseClient,
  reporterId: string,
  targetType: ReportTargetType,
  targetId: string,
  reason: string,
  details = "",
): Promise<{ report?: ContentReport; error?: string }> {
  const trimmed = reason.trim();
  if (!trimmed) return { error: "Please select a reason." };

  const { data, error } = await supabase
    .from("content_reports")
    .insert({
      reporter_id: reporterId,
      target_type: targetType,
      target_id: targetId,
      reason: trimmed,
      details: details.trim(),
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { report: data as ContentReport };
}

export async function submitAppeal(
  supabase: SupabaseClient,
  userId: string,
  subject: string,
  message: string,
): Promise<{ referenceId?: string; error?: string }> {
  const trimmedSubject = subject.trim();
  const trimmedMessage = message.trim();
  if (!trimmedSubject || !trimmedMessage) {
    return { error: "Subject and message are required." };
  }

  const { data, error } = await supabase
    .from("account_appeals")
    .insert({
      user_id: userId,
      subject: trimmedSubject,
      message: trimmedMessage,
    })
    .select("reference_id")
    .single();

  if (error) return { error: error.message };
  return { referenceId: data.reference_id as string };
}

export async function loadMyAppeals(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data } = await supabase
    .from("account_appeals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  return data ?? [];
}
