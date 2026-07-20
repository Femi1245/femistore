import { sendTransactionalEmail } from "./email";
import type { Profile } from "./types";

export const SUPPORT_CATEGORIES = [
  { value: "general", label: "General question" },
  { value: "account", label: "Account & login" },
  { value: "bug", label: "Bug or technical issue" },
  { value: "billing", label: "Payments & billing" },
  { value: "feature", label: "Feature request" },
  { value: "other", label: "Other" },
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number]["value"];

export type SupportContactInput = {
  name: string;
  email: string;
  category: SupportCategory;
  subject: string;
  message: string;
  profile?: Pick<Profile, "id" | "username" | "display_name"> | null;
};

const DEFAULT_SUPPORT_INBOX = "olaniranfemi01@gmail.com";

export function getSupportInboxEmail(): string {
  return (
    process.env.SUPPORT_EMAIL?.trim() ||
    process.env.ZUMELIA_OWNER_EMAIL?.trim() ||
    DEFAULT_SUPPORT_INBOX
  ).toLowerCase();
}

export function getSupportMailtoHref(): string {
  return `mailto:${getSupportInboxEmail()}?subject=${encodeURIComponent("Zumelia support")}`;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSupportContact(input: SupportContactInput): string | null {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const subject = input.subject.trim();
  const message = input.message.trim();

  if (!name) return "Please enter your name.";
  if (!email) return "Please enter your email address.";
  if (!EMAIL_PATTERN.test(email)) return "Please enter a valid email address.";
  if (!subject || subject.length < 3) return "Subject must be at least 3 characters.";
  if (subject.length > 120) return "Subject is too long (max 120 characters).";
  if (!message || message.length < 10) return "Message must be at least 10 characters.";
  if (message.length > 4000) return "Message is too long (max 4000 characters).";

  const validCategory = SUPPORT_CATEGORIES.some((c) => c.value === input.category);
  if (!validCategory) return "Please choose a valid category.";

  return null;
}

function categoryLabel(category: SupportCategory): string {
  return SUPPORT_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendSupportContactEmail(
  input: SupportContactInput,
): Promise<{ ok: boolean; error?: string }> {
  const validationError = validateSupportContact(input);
  if (validationError) return { ok: false, error: validationError };

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const subject = input.subject.trim();
  const message = input.message.trim();
  const category = categoryLabel(input.category);
  const inbox = getSupportInboxEmail();

  const profileLine = input.profile
    ? `\nZumelia profile: @${input.profile.username} (${input.profile.id})`
    : "";

  const text = [
    "New Zumelia support message",
    "",
    `From: ${name} <${email}>`,
    `Category: ${category}`,
    input.profile ? `Username: @${input.profile.username}` : null,
    input.profile ? `User ID: ${input.profile.id}` : null,
    "",
    subject,
    "",
    message,
    profileLine,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<body style="font-family:Georgia,serif;line-height:1.6;color:#2c2416;">
  <h2 style="color:#8b4513;">New Zumelia support message</h2>
  <p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
  <p><strong>Category:</strong> ${escapeHtml(category)}</p>
  ${
    input.profile
      ? `<p><strong>Profile:</strong> @${escapeHtml(input.profile.username)} (${escapeHtml(input.profile.id)})</p>`
      : ""
  }
  <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
  <hr style="border:none;border-top:1px solid #d4c4a8;margin:20px 0;" />
  <p style="white-space:pre-wrap;">${escapeHtml(message)}</p>
  <p style="margin-top:24px;font-size:13px;color:#7a6f5f;">Reply directly to this email to reach ${escapeHtml(name)}.</p>
</body>
</html>`;

  const result = await sendTransactionalEmail({
    to: inbox,
    replyTo: email,
    subject: `[Zumelia Support] ${subject}`,
    html,
    text,
    tags: [
      { name: "type", value: "support" },
      { name: "category", value: input.category },
    ],
  });

  if (!result.ok) {
    return { ok: false, error: result.error ?? "Could not send your message." };
  }

  return { ok: true };
}
