import type { SupabaseClient } from "@supabase/supabase-js";
import { isBirthdayToday } from "./birthday";
import { sendTransactionalEmail } from "./email";
import {
  birthdayWishEmail,
  purchaseConfirmationEmail,
  reengagementEmail,
  welcomeEmail,
  type ReengagementStage,
} from "./email-templates";
import { createAdminClient } from "./supabase/admin";
import type { Profile, SentGift } from "./types";

export type EmailNotificationType =
  | "birthday"
  | "purchase"
  | "welcome"
  | "reengagement";

function adminClient(): SupabaseClient {
  return createAdminClient();
}

async function getUserEmail(
  admin: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user?.email) return null;
  return data.user.email;
}

async function wasEmailSent(
  admin: SupabaseClient,
  userId: string,
  type: EmailNotificationType,
  referenceKey: string,
): Promise<boolean> {
  const { data } = await admin
    .from("email_notification_log")
    .select("id")
    .eq("user_id", userId)
    .eq("notification_type", type)
    .eq("reference_key", referenceKey)
    .maybeSingle();
  return !!data;
}

async function logEmailSent(
  admin: SupabaseClient,
  userId: string,
  type: EmailNotificationType,
  referenceKey: string,
): Promise<void> {
  await admin.from("email_notification_log").insert({
    user_id: userId,
    notification_type: type,
    reference_key: referenceKey,
  });
}

function todayReferenceKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function sendBirthdayEmailIfNeeded(
  admin: SupabaseClient,
  profile: Pick<Profile, "id" | "display_name" | "date_of_birth">,
): Promise<{ sent: boolean; error?: string }> {
  if (!profile.date_of_birth || !isBirthdayToday(profile.date_of_birth)) {
    return { sent: false };
  }

  const referenceKey = todayReferenceKey();
  if (await wasEmailSent(admin, profile.id, "birthday", referenceKey)) {
    return { sent: false };
  }

  const email = await getUserEmail(admin, profile.id);
  if (!email) return { sent: false, error: "No email on account" };

  const template = birthdayWishEmail(profile.display_name);
  const result = await sendTransactionalEmail({
    to: email,
    ...template,
    tags: [
      { name: "type", value: "birthday" },
      { name: "user_id", value: profile.id },
    ],
  });

  if (!result.ok) return { sent: false, error: result.error };

  await logEmailSent(admin, profile.id, "birthday", referenceKey);
  return { sent: true };
}

export async function sendPurchaseConfirmationEmail(
  gift: SentGift,
): Promise<{ sent: boolean; error?: string }> {
  const admin = adminClient();
  const referenceKey = gift.id;
  if (await wasEmailSent(admin, gift.sender_id, "purchase", referenceKey)) {
    return { sent: false };
  }

  const email = await getUserEmail(admin, gift.sender_id);
  if (!email) return { sent: false, error: "No email on account" };

  const [{ data: sender }, { data: recipient }, { data: catalog }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("display_name")
        .eq("id", gift.sender_id)
        .maybeSingle(),
      admin
        .from("profiles")
        .select("display_name")
        .eq("id", gift.recipient_id)
        .maybeSingle(),
      admin
        .from("gift_catalog")
        .select("name, emoji")
        .eq("id", gift.catalog_id)
        .maybeSingle(),
    ]);

  if (!catalog) return { sent: false, error: "Gift catalog item not found" };

  const template = purchaseConfirmationEmail({
    buyerName: (sender?.display_name as string) ?? "Friend",
    itemName: catalog.name as string,
    itemEmoji: catalog.emoji as string,
    amountCents: gift.amount_cents,
    orderId: gift.id,
    recipientName: recipient?.display_name as string | undefined,
  });

  const result = await sendTransactionalEmail({
    to: email,
    ...template,
    tags: [
      { name: "type", value: "purchase" },
      { name: "gift_id", value: gift.id },
    ],
  });

  if (!result.ok) return { sent: false, error: result.error };

  await logEmailSent(admin, gift.sender_id, "purchase", referenceKey);
  return { sent: true };
}

export async function sendWelcomeEmailIfNeeded(input: {
  userId: string;
  displayName: string;
  email: string;
  accountKind?: "personal" | "business";
}): Promise<{ sent: boolean; error?: string }> {
  const admin = adminClient();
  const referenceKey = "once";

  if (await wasEmailSent(admin, input.userId, "welcome", referenceKey)) {
    return { sent: false };
  }

  const template = welcomeEmail(
    input.displayName,
    input.accountKind ?? "personal",
  );
  const result = await sendTransactionalEmail({
    to: input.email,
    ...template,
    tags: [
      { name: "type", value: "welcome" },
      { name: "user_id", value: input.userId },
    ],
  });

  if (!result.ok) return { sent: false, error: result.error };

  await logEmailSent(admin, input.userId, "welcome", referenceKey);
  return { sent: true };
}

const SKIP_WELCOME_EMAILS = new Set(["zumelia-ai@assistant.zumelia.app"]);

/** Send welcome email to every signed-up user who has not received one yet. */
export async function runWelcomeEmailBackfill(
  admin: SupabaseClient,
): Promise<{
  checked: number;
  sent: number;
  skipped: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let checked = 0;
  let sent = 0;
  let skipped = 0;

  let page = 1;
  const perPage = 200;

  for (;;) {
    const { data: list, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      return { checked, sent, skipped, errors: [error.message] };
    }

    const users = list.users ?? [];
    if (!users.length) break;

    for (const user of users) {
      const email = user.email?.trim().toLowerCase();
      if (!email || SKIP_WELCOME_EMAILS.has(email)) {
        skipped += 1;
        continue;
      }

      checked += 1;

      if (await wasEmailSent(admin, user.id, "welcome", "once")) {
        skipped += 1;
        continue;
      }

      const { data: profile } = await admin
        .from("profiles")
        .select("display_name, account_kind")
        .eq("id", user.id)
        .maybeSingle();

      const displayName =
        (profile?.display_name as string | undefined) ||
        String(user.user_metadata?.display_name ?? user.user_metadata?.full_name ?? "") ||
        email.split("@")[0];

      const accountKind =
        (profile?.account_kind as string | undefined) === "business"
          ? "business"
          : "personal";

      const result = await sendWelcomeEmailIfNeeded({
        userId: user.id,
        displayName,
        email,
        accountKind,
      });

      if (result.sent) {
        sent += 1;
      } else if (result.error) {
        errors.push(`${email}: ${result.error}`);
      } else {
        skipped += 1;
      }

      // Gentle rate limit for Resend (2 req/s on free tier)
      await new Promise((resolve) => setTimeout(resolve, 600));
    }

    if (users.length < perPage) break;
    page += 1;
  }

  return { checked, sent, skipped, errors };
}

export async function sendReengagementEmailIfNeeded(
  admin: SupabaseClient,
  profile: Pick<
    Profile,
    "id" | "display_name" | "last_seen_at" | "created_at" | "account_kind"
  >,
  stage: ReengagementStage,
): Promise<{ sent: boolean; error?: string }> {
  const referenceKey = stage;
  if (await wasEmailSent(admin, profile.id, "reengagement", referenceKey)) {
    return { sent: false };
  }

  const email = await getUserEmail(admin, profile.id);
  if (!email) return { sent: false, error: "No email on account" };

  const template = reengagementEmail(profile.display_name, stage);
  const result = await sendTransactionalEmail({
    to: email,
    ...template,
    tags: [
      { name: "type", value: "reengagement" },
      { name: "stage", value: stage },
      { name: "user_id", value: profile.id },
    ],
  });

  if (!result.ok) return { sent: false, error: result.error };

  await logEmailSent(admin, profile.id, "reengagement", referenceKey);
  return { sent: true };
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

function lastActiveAt(
  profile: Pick<Profile, "last_seen_at" | "created_at">,
): Date {
  const raw = profile.last_seen_at ?? profile.created_at;
  return new Date(raw);
}

const REENGAGEMENT_STAGES: { stage: ReengagementStage; inactiveDays: number }[] =
  [
    { stage: "14d", inactiveDays: 14 },
    { stage: "7d", inactiveDays: 7 },
    { stage: "3d", inactiveDays: 3 },
  ];

export async function runReengagementEmails(
  admin: SupabaseClient,
): Promise<{ checked: number; sent: number; errors: string[] }> {
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, display_name, last_seen_at, created_at, account_kind");

  if (error) {
    return { checked: 0, sent: 0, errors: [error.message] };
  }

  let sent = 0;
  const errors: string[] = [];
  const rows = (profiles ?? []) as Pick<
    Profile,
    "id" | "display_name" | "last_seen_at" | "created_at" | "account_kind"
  >[];

  for (const profile of rows) {
    const activeAt = lastActiveAt(profile);
    const accountAgeDays =
      (Date.now() - new Date(profile.created_at).getTime()) /
      (1000 * 60 * 60 * 24);

    if (accountAgeDays < 3) continue;

    let emailed = false;
    for (const { stage, inactiveDays } of REENGAGEMENT_STAGES) {
      if (activeAt > daysAgo(inactiveDays)) continue;

      const result = await sendReengagementEmailIfNeeded(
        admin,
        profile,
        stage,
      );
      if (result.sent) {
        sent += 1;
        emailed = true;
        break;
      }
      if (result.error) errors.push(`${profile.id}/${stage}: ${result.error}`);
    }

    if (emailed) continue;
  }

  return { checked: rows.length, sent, errors };
}

export async function runDailyBirthdayEmails(
  admin: SupabaseClient,
): Promise<{ checked: number; sent: number; errors: string[] }> {
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, display_name, date_of_birth")
    .not("date_of_birth", "is", null);

  if (error) {
    return { checked: 0, sent: 0, errors: [error.message] };
  }

  const birthdayProfiles = (profiles ?? []).filter(
    (p) => p.date_of_birth && isBirthdayToday(p.date_of_birth as string),
  );

  let sent = 0;
  const errors: string[] = [];

  for (const profile of birthdayProfiles) {
    const result = await sendBirthdayEmailIfNeeded(
      admin,
      profile as Pick<Profile, "id" | "display_name" | "date_of_birth">,
    );
    if (result.sent) sent += 1;
    if (result.error) errors.push(`${profile.id}: ${result.error}`);
  }

  return { checked: birthdayProfiles.length, sent, errors };
}
