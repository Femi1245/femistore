import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUSINESS_AUTO_REPLY_PROMPT, generateAssistantReply } from "@/lib/assistant";
import { hasBusinessProfile } from "@/lib/business";
import { isInQuietHours } from "@/lib/notification-delivery";
import type { BusinessAutoReplyMode, Message, Profile } from "@/lib/types";

export function shouldAutoReplyBusiness(profile: Profile): boolean {
  return (
    hasBusinessProfile(profile) &&
    profile.business_auto_reply_enabled &&
    !!profile.business_auto_reply_message?.trim()
  );
}

/** Auto-reply only runs inside the configured window; empty start/end = always. */
export function isWithinAutoReplyWindow(
  profile: Pick<Profile, "business_auto_reply_hours_start" | "business_auto_reply_hours_end">,
  now = new Date(),
): boolean {
  const start = profile.business_auto_reply_hours_start?.trim();
  const end = profile.business_auto_reply_hours_end?.trim();
  if (!start || !end) return true;

  return isInQuietHours(
    { quiet_hours_start: start, quiet_hours_end: end },
    now,
  );
}

export async function canSendBusinessAutoReply(
  supabase: SupabaseClient,
  conversationId: string,
  businessProfile: Profile,
): Promise<{ allowed: boolean; reason?: string }> {
  if (!shouldAutoReplyBusiness(businessProfile)) {
    return { allowed: false, reason: "disabled" };
  }

  if (!isWithinAutoReplyWindow(businessProfile)) {
    return { allowed: false, reason: "outside_hours" };
  }

  const { data: conv } = await supabase
    .from("conversations")
    .select("dm_context")
    .eq("id", conversationId)
    .maybeSingle();

  if (conv?.dm_context !== "business") {
    return { allowed: false, reason: "not_gig_inquiry" };
  }

  const maxCount = businessProfile.business_auto_reply_max_count ?? 1;
  const { count, error } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .eq("sender_id", businessProfile.id)
    .eq("is_auto_reply", true);

  if (error?.message?.includes("is_auto_reply")) {
    const { count: fallbackCount } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("conversation_id", conversationId)
      .eq("sender_id", businessProfile.id);

    if ((fallbackCount ?? 0) >= maxCount) {
      return { allowed: false, reason: "limit_reached" };
    }
    return { allowed: true };
  }

  if ((count ?? 0) >= maxCount) {
    return { allowed: false, reason: "limit_reached" };
  }

  return { allowed: true };
}

async function buildAutoReplyText(
  businessProfile: Profile,
  customerMessage: string,
  mode: BusinessAutoReplyMode,
): Promise<string> {
  const template = businessProfile.business_auto_reply_message!.trim();

  if (mode === "template") {
    return template;
  }

  const context = [
    `Business: ${businessProfile.business_name}`,
    businessProfile.business_tagline ? `Tagline: ${businessProfile.business_tagline}` : "",
    businessProfile.business_description
      ? `About: ${businessProfile.business_description}`
      : "",
    businessProfile.business_services
      ? `Services: ${businessProfile.business_services}`
      : "",
    businessProfile.business_location
      ? `Location: ${businessProfile.business_location}`
      : "",
    `Custom auto-reply instructions: ${template}`,
    `Customer message: ${customerMessage}`,
    "Reply as the business in a warm, helpful tone. Keep it concise.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const result = await generateAssistantReply([], context, {
      systemPrompt: BUSINESS_AUTO_REPLY_PROMPT,
    });
    return result.reply;
  } catch {
    return template;
  }
}

export async function sendBusinessAutoReply(
  conversationId: string,
  businessProfile: Profile,
  customerMessage: string,
  supabase?: SupabaseClient,
): Promise<Message | null> {
  const checker = supabase ?? createAdminClient();
  const gate = await canSendBusinessAutoReply(checker, conversationId, businessProfile);
  if (!gate.allowed) return null;

  const mode = businessProfile.business_auto_reply_mode ?? "template";
  const reply = await buildAutoReplyText(businessProfile, customerMessage, mode);

  const admin = createAdminClient();
  const payload: Record<string, unknown> = {
    conversation_id: conversationId,
    sender_id: businessProfile.id,
    content: reply.slice(0, 4000),
    is_auto_reply: true,
  };

  let { data, error } = await admin.from("messages").insert(payload).select().single();

  if (error?.message?.includes("is_auto_reply")) {
    ({ data, error } = await admin
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: businessProfile.id,
        content: reply.slice(0, 4000),
      })
      .select()
      .single());
  }

  if (error || !data) return null;
  return data as Message;
}
