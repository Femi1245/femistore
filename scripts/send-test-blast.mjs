/**
 * One-off: email every real user (skips Zumelia AI bot).
 * Does NOT write to email_notification_log (won't block welcome/re-engagement).
 *
 * Usage: node scripts/send-test-blast.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const SKIP_EMAILS = new Set(["zumelia-ai@assistant.zumelia.app"]);

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
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendKey = process.env.RESEND_API_KEY?.trim();
const from = process.env.EMAIL_FROM?.trim();
const origin = (
  process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://zumelia.app"
).replace(/\/$/, "");

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!resendKey || !from) {
  console.error("Missing RESEND_API_KEY or EMAIL_FROM");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function buildEmail(displayName) {
  const name = (displayName || "there").trim() || "there";
  const subject = `Hey ${name} — Zumelia is live for you 🟠`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Georgia,serif;color:#2c2416;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#fffdf8;border:1px solid #d4c4a8;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:28px 32px 8px;text-align:center;">
          <div style="font-size:22px;font-weight:bold;color:#8b4513;">Zumelia</div>
        </td></tr>
        <tr><td style="padding:8px 32px 28px;line-height:1.6;font-size:16px;">
          <p style="font-size:20px;font-weight:bold;margin:0 0 16px;">Hi ${name},</p>
          <p style="margin:0 0 12px;">This is a quick hello from Zumelia — chat, feed, live, and gifts are ready when you are.</p>
          <p style="margin:0 0 12px;">Open the app, say hi to someone, or post your first update. Your circle is waiting.</p>
          <p style="margin:24px 0 0;text-align:center;">
            <a href="${origin}/feed" style="display:inline-block;background:#8b4513;color:#fffdf8;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Open Zumelia</a>
          </p>
        </td></tr>
        <tr><td style="padding:16px 32px 24px;border-top:1px solid #e8dcc8;font-size:12px;color:#7a6f5f;text-align:center;">
          <a href="${origin}" style="color:#8b4513;">zumelia.app</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  const text = `Hi ${name},\n\nThis is a quick hello from Zumelia — chat, feed, live, and gifts are ready when you are.\n\nOpen Zumelia: ${origin}/feed\n`;
  return { subject, html, text };
}

async function sendOne(to, displayName) {
  const template = buildEmail(displayName);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: template.subject,
      html: template.html,
      text: template.text,
      tags: [{ name: "type", value: "test_blast" }],
    }),
  });
  const body = await res.text();
  if (!res.ok) return { ok: false, error: body || `HTTP ${res.status}` };
  let id;
  try {
    id = JSON.parse(body).id;
  } catch {
    id = undefined;
  }
  return { ok: true, id };
}

const { data: list, error } = await admin.auth.admin.listUsers({
  page: 1,
  perPage: 200,
});
if (error) {
  console.error("Failed to list users:", error.message);
  process.exit(1);
}

const recipients = [];
for (const user of list.users) {
  const email = user.email?.trim();
  if (!email || SKIP_EMAILS.has(email.toLowerCase())) continue;
  const { data: profile } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  recipients.push({
    email,
    displayName: profile?.display_name || user.user_metadata?.display_name || email.split("@")[0],
  });
}

console.log(`Sending to ${recipients.length} users (skipped AI bot)...`);

let sent = 0;
const failures = [];
for (const r of recipients) {
  const result = await sendOne(r.email, r.displayName);
  if (result.ok) {
    sent += 1;
    console.log(`OK  ${r.email}  id=${result.id ?? "?"}`);
  } else {
    failures.push({ email: r.email, error: result.error });
    console.error(`FAIL ${r.email}: ${result.error}`);
  }
  // gentle pacing for Resend rate limits
  await new Promise((r) => setTimeout(r, 400));
}

console.log(`\nDone. sent=${sent} failed=${failures.length}`);
if (failures.length) process.exit(1);
