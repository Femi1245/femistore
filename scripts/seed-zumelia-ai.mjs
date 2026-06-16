/**
 * Creates the @zumelia-ai assistant via Supabase Admin API.
 * Usage: node scripts/seed-zumelia-ai.mjs
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ASSISTANT_USERNAME = "zumelia-ai";
const ASSISTANT_DISPLAY_NAME = "Zumelia AI";
const ASSISTANT_EMAIL = "zumelia-ai@assistant.zumelia.app";

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

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: existing } = await admin
  .from("profiles")
  .select("id, username, display_name")
  .eq("username", ASSISTANT_USERNAME)
  .maybeSingle();

if (existing) {
  console.log("OK — zumelia-ai already exists:", existing);
  process.exit(0);
}

let userId = null;

const { data: created, error: createError } = await admin.auth.admin.createUser({
  email: ASSISTANT_EMAIL,
  email_confirm: true,
  user_metadata: {
    display_name: ASSISTANT_DISPLAY_NAME,
    username: ASSISTANT_USERNAME,
  },
});

if (createError) {
  const msg = createError.message.toLowerCase();
  if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
    const { data: listed } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const found = listed?.users?.find((u) => u.email === ASSISTANT_EMAIL);
    if (!found) {
      console.error("Auth user exists but could not be found by email:", createError.message);
      process.exit(1);
    }
    userId = found.id;
    console.log("Found existing auth user:", userId);
  } else {
    console.error("createUser failed:", createError.message);
    process.exit(1);
  }
} else {
  userId = created.user.id;
  console.log("Created auth user:", userId);
}

let { data: profile } = await admin
  .from("profiles")
  .select("*")
  .eq("id", userId)
  .maybeSingle();

if (!profile) {
  const { data: inserted, error: insertError } = await admin
    .from("profiles")
    .insert({
      id: userId,
      username: ASSISTANT_USERNAME,
      display_name: ASSISTANT_DISPLAY_NAME,
      country: "Global",
      bio: "Your Zumelia assistant — ask me anything about the app, your business, or everyday topics.",
    })
    .select()
    .single();

  if (insertError) {
    console.error("Profile insert failed:", insertError.message);
    process.exit(1);
  }
  profile = inserted;
} else if (profile.username !== ASSISTANT_USERNAME) {
  const { data: updated, error: updateError } = await admin
    .from("profiles")
    .update({
      username: ASSISTANT_USERNAME,
      display_name: ASSISTANT_DISPLAY_NAME,
      bio: "Your Zumelia assistant — ask me anything about the app, your business, or everyday topics.",
    })
    .eq("id", userId)
    .select()
    .single();

  if (updateError) {
    console.error("Profile update failed:", updateError.message);
    process.exit(1);
  }
  profile = updated;
}

console.log("OK — zumelia-ai ready:", {
  id: profile.id,
  username: profile.username,
  display_name: profile.display_name,
});
