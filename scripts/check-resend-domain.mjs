/**
 * Read-only: list Resend domains + verification status.
 * Usage: node scripts/check-resend-domain.mjs
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

const key = process.env.RESEND_API_KEY?.trim();
const from = process.env.EMAIL_FROM?.trim() || "";
const host = (from.match(/@([^>\s]+)/) || [])[1] || "?";

if (!key) {
  console.error("Missing RESEND_API_KEY");
  process.exit(1);
}

console.log(`EMAIL_FROM host=${host}`);

const res = await fetch("https://api.resend.com/domains", {
  headers: { Authorization: `Bearer ${key}` },
});
const body = await res.text();
if (!res.ok) {
  console.error(`list_status=${res.status}`);
  console.error(body);
  process.exit(1);
}

const data = JSON.parse(body);
const domains = data.data || [];
if (!domains.length) {
  console.log("(no domains on this Resend account)");
  process.exit(0);
}

for (const d of domains) {
  const records = (d.records || [])
    .map((r) => `${r.record}:${r.status}`)
    .join(", ");
  console.log(
    `${d.name} | status=${d.status}${records ? ` | ${records}` : ""}`,
  );
}

const match = domains.find(
  (d) => d.name === host || host.endsWith(`.${d.name}`),
);
if (match) {
  console.log(
    match.status === "verified"
      ? `\nOK: ${match.name} is verified — ready to send.`
      : `\nNOT READY: ${match.name} status=${match.status}. Finish DNS + Verify in Resend.`,
  );
} else {
  console.log(`\nNo domain matching EMAIL_FROM host (${host}).`);
}
