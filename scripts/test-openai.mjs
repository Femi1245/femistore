/**
 * Quick OpenAI connectivity check.
 * Usage: node scripts/test-openai.mjs
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

const apiKey = process.env.OPENAI_API_KEY?.trim();
const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

if (!apiKey) {
  console.error("OPENAI_API_KEY is not set in .env.local");
  process.exit(1);
}

const res = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model,
    messages: [
      { role: "system", content: "Reply with exactly: Zumelia AI is online." },
      { role: "user", content: "ping" },
    ],
    max_tokens: 20,
  }),
});

const json = await res.json();

if (!res.ok) {
  console.error("OpenAI error:", res.status, json.error?.message ?? json);
  process.exit(1);
}

const text = json.choices?.[0]?.message?.content?.trim();
console.log("OK — model:", model);
console.log("Reply:", text);
