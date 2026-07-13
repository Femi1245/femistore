/**
 * One probe email to the Resend account owner to check domain verification.
 * Usage: node scripts/probe-resend-domain.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

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

const from = process.env.EMAIL_FROM?.trim();
const key = process.env.RESEND_API_KEY?.trim();
const to = "olaniranfemi01@gmail.com";
const host = (from?.match(/@([^>\s]+)/) || [])[1] || "?";

if (!from || !key) {
  console.error("Missing EMAIL_FROM or RESEND_API_KEY");
  process.exit(1);
}

console.log(`from_host=${host}`);
console.log(`to=${to}`);

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from,
    to: [to],
    subject: "Zumelia domain check",
    text: "Domain verification probe from Zumelia.",
    html: "<p>Domain verification probe from Zumelia.</p>",
    tags: [{ name: "type", value: "domain_check" }],
  }),
});

const body = await res.text();
console.log(`status=${res.status}`);
console.log(body);

if (!res.ok) process.exit(1);
console.log("\nOK: domain accepted by Resend — ready for full blast.");
