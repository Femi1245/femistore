#!/usr/bin/env node
/**
 * One-time setup for phone push notifications.
 * Usage: npm run push:setup
 */

import { randomBytes } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const envLocalPath = join(root, ".env.local");
const mobileEnvPath = join(root, "mobile", ".env");
const apiUrl = "https://itunes-mu.vercel.app";

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

function upsertEnvLine(content, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(content)) return content.replace(re, line);
  return `${content.trimEnd()}\n${line}\n`;
}

async function main() {
  const env = loadEnvFile(envLocalPath);
  let secret =
    env.PUSH_WEBHOOK_SECRET?.trim() ||
    env.CRON_SECRET?.trim() ||
    randomBytes(32).toString("hex");

  let envLocal = existsSync(envLocalPath)
    ? await readFile(envLocalPath, "utf8")
    : "";
  if (!env.PUSH_WEBHOOK_SECRET?.trim()) {
    envLocal = upsertEnvLine(envLocal, "PUSH_WEBHOOK_SECRET", secret);
    await writeFile(envLocalPath, envLocal, "utf8");
    console.log("✓ Added PUSH_WEBHOOK_SECRET to .env.local");
  } else {
    secret = env.PUSH_WEBHOOK_SECRET.trim();
    console.log("✓ PUSH_WEBHOOK_SECRET already in .env.local");
  }

  console.log("\n--- Supabase trigger ---");
  console.log("Applied: pg_net trigger on notifications INSERT → /api/push/dispatch");
  console.log("Store your webhook secret once in Supabase SQL Editor:");
  console.log(`
  insert into private.push_config (key, value)
  values ('webhook_secret', '<your PUSH_WEBHOOK_SECRET from .env.local>')
  on conflict (key) do update set value = excluded.value;
`);

  console.log("--- Vercel env (required for production push) ---");
  console.log("Add PUSH_WEBHOOK_SECRET to Vercel (same value as .env.local)\n");

  try {
    const probe = await fetch(`${apiUrl}/api/push/dispatch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        record: {
          id: "00000000-0000-0000-0000-000000000001",
          recipient_id: "00000000-0000-0000-0000-000000000000",
          type: "follow",
        },
      }),
    });
    if (probe.status === 401) {
      console.log(
        "⚠ /api/push/dispatch returned 401 — deploy latest code + set PUSH_WEBHOOK_SECRET on Vercel",
      );
    } else if (probe.ok) {
      const body = await probe.json().catch(() => ({}));
      console.log(`✓ /api/push/dispatch reachable (${probe.status})`, body.skipped ?? "");
    } else if (probe.status === 404) {
      console.log("⚠ /api/push/dispatch not deployed yet — push API routes need a Vercel deploy");
    } else {
      console.log(`⚠ /api/push/dispatch returned ${probe.status}`);
    }
  } catch {
    console.log("⚠ Could not reach production API");
  }

  console.log("\n--- Mobile EAS projectId ---");
  let mobileEnv = existsSync(mobileEnvPath)
    ? await readFile(mobileEnvPath, "utf8")
    : "";
  const mobileVars = loadEnvFile(mobileEnvPath);
  if (!mobileVars.EXPO_PUBLIC_EAS_PROJECT_ID) {
    try {
      const out = execSync("npx eas project:info --json", {
        cwd: join(root, "mobile"),
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      const info = JSON.parse(out);
      const projectId = info?.id ?? info?.projectId;
      if (projectId) {
        mobileEnv = upsertEnvLine(mobileEnv, "EXPO_PUBLIC_EAS_PROJECT_ID", projectId);
        await writeFile(mobileEnvPath, mobileEnv, "utf8");
        console.log(`✓ Set EXPO_PUBLIC_EAS_PROJECT_ID=${projectId} in mobile/.env`);
      }
    } catch {
      console.log(`Run in mobile/:
  npx eas login
  npx eas init
Then add EXPO_PUBLIC_EAS_PROJECT_ID to mobile/.env`);
    }
  } else {
    console.log(`✓ EXPO_PUBLIC_EAS_PROJECT_ID=${mobileVars.EXPO_PUBLIC_EAS_PROJECT_ID}`);
  }

  console.log("\n--- Build APK ---");
  console.log("  npm run mobile:apk");
  console.log("\nPush needs a physical phone + EAS build (not Expo Go).\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
