/**
 * Send the standard welcome email to every user who signed up but never got one.
 * Uses email_notification_log — safe to run multiple times (skips already welcomed).
 *
 * Usage: node scripts/send-welcome-backfill.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";
import dns from "node:dns";

const resolve4 = promisify(dns.resolve4);

function fromDomain(from) {
  const match = from?.match(/@([^>\s]+)/);
  return match?.[1]?.toLowerCase() ?? null;
}

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendKey = process.env.RESEND_API_KEY?.trim();
const from = process.env.EMAIL_FROM?.trim();
const origin = (
  process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://itunes-mu.vercel.app"
).replace(/\/$/, "");

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!resendKey || !from) {
  console.error("Missing RESEND_API_KEY or EMAIL_FROM");
  process.exit(1);
}

const fromHost = fromDomain(from);
if (fromHost && fromHost !== "resend.dev") {
  try {
    await resolve4(fromHost);
  } catch {
    console.error(`\n✗ Domain "${fromHost}" is not registered (no DNS).`);
    console.error("  Resend cannot verify a domain you do not own.\n");
    console.error("Fix:");
    console.error("  1. Buy the domain (Cloudflare, Namecheap, GoDaddy, …)");
    console.error("  2. Resend → Domains → Add domain → add DNS records");
    console.error("  3. Wait for Verify status = verified");
    console.error(`  4. Keep EMAIL_FROM using @${fromHost}`);
    console.error("  5. Run: npm run email:welcome-backfill\n");
    console.error("Or use a domain you already verified in Resend:");
    console.error("  EMAIL_FROM=Zumelia <notifications@YOUR-VERIFIED-DOMAIN.com>\n");
    process.exit(1);
  }
}

function isDomainVerificationError(body) {
  return (
    body.includes("domain is not verified") ||
    body.includes("verify a domain at resend.com/domains")
  );
}

function printDomainFix(fromAddress) {
  const host = fromDomain(fromAddress) ?? "yourdomain.com";
  console.error("\n--- Resend domain not verified ---");
  console.error(`EMAIL_FROM uses: ${fromAddress}`);
  console.error("\nFix:");
  console.error("  1. Open https://resend.com/domains");
  console.error(`  2. Add "${host}" (or pick your already-verified domain)`);
  console.error("  3. Add the SPF + DKIM DNS records at your registrar");
  console.error('  4. Click Verify — status must show "verified"');
  console.error(`  5. EMAIL_FROM=Zumelia <notifications@${host}>`);
  console.error("  6. Same values in Vercel env, then redeploy");
  console.error("  7. Run: npm run email:welcome-backfill\n");
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SKIP_EMAILS = new Set(["zumelia-ai@assistant.zumelia.app"]);

function welcomeTemplate(displayName, accountKind = "personal") {
  const name = (displayName || "there").trim() || "there";
  const subject = `Welcome to Zumelia, ${name} — your space is ready 🟠`;
  const personalTips = [
    "Say hi in Chat — message friends or discover new people",
    "Post your first update on the Feed",
    "Explore Live, games, and gifts when you're ready",
  ];
  const businessTips = [
    "Finish your business storefront and list a service gig",
    "Turn on your seller inbox for customer inquiries",
    "Go live to showcase your brand to your audience",
  ];
  const tips = accountKind === "business" ? businessTips : personalTips;
  const tipHtml = tips.map((t) => `<li>${t}</li>`).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Georgia,serif;color:#2c2416;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#fffdf8;border:1px solid #d4c4a8;border-radius:16px;">
        <tr><td style="padding:28px 32px 8px;text-align:center;">
          <div style="font-size:22px;font-weight:bold;color:#8b4513;">Zumelia</div>
        </td></tr>
        <tr><td style="padding:8px 32px 28px;line-height:1.6;font-size:16px;">
          <p style="font-size:20px;font-weight:bold;margin:0 0 16px;">Welcome to Zumelia, ${name}! 🟠</p>
          <p style="margin:0 0 12px;">You just joined a premium social home for real conversation, live moments, and business — built for connection, not endless scrolling.</p>
          <p style="margin:0 0 8px;font-weight:bold;">Here's how to get started:</p>
          <ul style="margin:12px 0;padding-left:20px;line-height:1.7;">${tipHtml}</ul>
          <p style="margin:16px 0 0;">We're glad you're here. Your people are waiting.</p>
          <p style="margin:24px 0 0;text-align:center;">
            <a href="${origin}/feed" style="display:inline-block;background:#8b4513;color:#fffdf8;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Open your feed</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Welcome to Zumelia, ${name}!\n\nYou just joined a premium social home for real conversation, live moments, and business.\n\nOpen your feed: ${origin}/feed\n\nWe're glad you're here.\n\n${origin}`;
  return { subject, html, text };
}

async function wasWelcomeSent(userId) {
  const { data } = await admin
    .from("email_notification_log")
    .select("id")
    .eq("user_id", userId)
    .eq("notification_type", "welcome")
    .eq("reference_key", "once")
    .maybeSingle();
  return !!data;
}

async function logWelcomeSent(userId) {
  await admin.from("email_notification_log").insert({
    user_id: userId,
    notification_type: "welcome",
    reference_key: "once",
  });
}

async function sendWelcome(userId, email, displayName, accountKind) {
  const template = welcomeTemplate(displayName, accountKind);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: template.subject,
      html: template.html,
      text: template.text,
      tags: [
        { name: "type", value: "welcome" },
        { name: "user_id", value: userId },
      ],
    }),
  });
  const body = await res.text();
  if (!res.ok) {
    if (isDomainVerificationError(body)) {
      printDomainFix(from);
      process.exit(1);
    }
    return { ok: false, error: body || `HTTP ${res.status}` };
  }
  await logWelcomeSent(userId);
  return { ok: true };
}

let page = 1;
const perPage = 200;
let checked = 0;
let sent = 0;
let skipped = 0;
const failures = [];

console.log("Welcome email backfill — sending to users who never received one...\n");

for (;;) {
  const { data: list, error } = await admin.auth.admin.listUsers({ page, perPage });
  if (error) {
    console.error("Failed to list users:", error.message);
    process.exit(1);
  }

  const users = list.users ?? [];
  if (!users.length) break;

  for (const user of users) {
    const email = user.email?.trim().toLowerCase();
    if (!email || SKIP_EMAILS.has(email)) {
      skipped += 1;
      continue;
    }

    checked += 1;

    if (await wasWelcomeSent(user.id)) {
      skipped += 1;
      continue;
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("display_name, account_kind")
      .eq("id", user.id)
      .maybeSingle();

    const displayName =
      profile?.display_name ||
      user.user_metadata?.display_name ||
      user.user_metadata?.full_name ||
      email.split("@")[0];

    const accountKind = profile?.account_kind === "business" ? "business" : "personal";

    const result = await sendWelcome(user.id, email, displayName, accountKind);
    if (result.ok) {
      sent += 1;
      console.log(`✓ ${email}`);
    } else {
      if (typeof result.error === "string" && isDomainVerificationError(result.error)) {
        printDomainFix(from);
        process.exit(1);
      }
      failures.push({ email, error: result.error });
      console.error(`✗ ${email}: ${result.error}`);
    }

    await new Promise((r) => setTimeout(r, 600));
  }

  if (users.length < perPage) break;
  page += 1;
}

console.log(`\nDone. Checked: ${checked}, sent: ${sent}, skipped: ${skipped}, failed: ${failures.length}`);
if (failures.length) {
  process.exit(1);
}
