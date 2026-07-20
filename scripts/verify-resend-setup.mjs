/**
 * Check Resend email setup before bulk sends.
 * Usage: node scripts/verify-resend-setup.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";
import dns from "node:dns";

const resolve4 = promisify(dns.resolve4);
const resolveTxt = promisify(dns.resolveTxt);

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

function fromDomain(from) {
  const match = from?.match(/@([^>\s]+)/);
  return match?.[1]?.toLowerCase() ?? null;
}

loadEnvLocal();

const resendKey = process.env.RESEND_API_KEY?.trim();
const from = process.env.EMAIL_FROM?.trim();
const domain = fromDomain(from);

console.log("Resend email setup check\n");
console.log(`EMAIL_FROM: ${from || "(missing)"}`);
console.log(`Domain:     ${domain || "(could not parse)"}\n`);

let ok = true;

if (!resendKey) {
  console.error("✗ Missing RESEND_API_KEY in .env.local");
  ok = false;
}

if (!from) {
  console.error("✗ Missing EMAIL_FROM in .env.local");
  ok = false;
}

if (domain === "resend.dev") {
  console.warn(
    "⚠ onboarding@resend.dev only sends to YOUR Resend account email — not all users.",
  );
  console.warn("  Verify your own domain to email every signup.\n");
}

if (domain && domain !== "resend.dev") {
  try {
    await resolve4(domain);
    console.log(`✓ Domain ${domain} exists in DNS`);
  } catch {
    console.error(`✗ Domain ${domain} is not registered (no DNS records found)`);
    console.error("  Buy the domain first, then verify it in Resend.\n");
    ok = false;
  }

  if (ok) {
    try {
      const txt = await resolveTxt(domain);
      const flat = txt.map((r) => r.join("")).join(" ");
      const hasSpf = flat.includes("spf1") || flat.includes("_spf");
      if (hasSpf) {
        console.log("✓ SPF TXT record found");
      } else {
        console.warn("⚠ No SPF record detected yet — add Resend DNS records");
      }
    } catch {
      console.warn("⚠ No TXT records on root domain yet");
    }
  }
}

if (!ok) {
  console.log("\n--- How to fix ---");
  console.log("1. Buy your domain (e.g. zumelia.app) at Cloudflare, Namecheap, or GoDaddy");
  console.log("2. Resend → Domains → Add domain → copy DNS records");
  console.log("3. Paste DNS records at your domain registrar");
  console.log("4. Resend → Domains → Verify (wait 5–15 min)");
  console.log("5. Set EMAIL_FROM=Zumelia <notifications@yourdomain.com>");
  console.log("6. Run: npm run email:welcome-backfill");
  process.exit(1);
}

console.log("\n✓ Basic checks passed. Run: npm run email:welcome-backfill");
console.log("  (If Resend still says domain not verified, finish step 4 in the dashboard.)\n");
