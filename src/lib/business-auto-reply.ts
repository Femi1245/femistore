import { createAdminClient } from "@/lib/supabase/admin";
import { BUSINESS_AUTO_REPLY_PROMPT, generateAssistantReply } from "@/lib/assistant";
import type { Message, Profile } from "@/lib/types";
import { hasBusinessProfile } from "@/lib/business";

export function shouldAutoReplyBusiness(profile: Profile): boolean {
  return (
    hasBusinessProfile(profile) &&
    profile.business_auto_reply_enabled &&
    !!profile.business_auto_reply_message?.trim()
  );
}

export async function sendBusinessAutoReply(
  conversationId: string,
  businessProfile: Profile,
  customerMessage: string,
): Promise<Message | null> {
  if (!shouldAutoReplyBusiness(businessProfile)) return null;

  const template = businessProfile.business_auto_reply_message!.trim();
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

  let reply: string;
  try {
    const result = await generateAssistantReply([], context, {
      systemPrompt: BUSINESS_AUTO_REPLY_PROMPT,
    });
    reply = result.reply;
  } catch {
    reply = template;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: businessProfile.id,
      content: reply.slice(0, 4000),
    })
    .select()
    .single();

  if (error || !data) return null;
  return data as Message;
}
