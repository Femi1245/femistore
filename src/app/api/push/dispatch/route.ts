import { NextResponse } from "next/server";
import { sendPushForNotification } from "@/lib/push-notifications";
import type { Notification } from "@/lib/types";

export const runtime = "nodejs";

function webhookAuthorized(request: Request): boolean {
  const secret =
    process.env.PUSH_WEBHOOK_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  const headerSecret = request.headers.get("x-push-webhook-secret");
  return headerSecret === secret;
}

function extractNotification(body: unknown): Notification | null {
  if (!body || typeof body !== "object") return null;

  const record =
    "record" in body && body.record && typeof body.record === "object"
      ? (body.record as Record<string, unknown>)
      : "notification" in body &&
          body.notification &&
          typeof body.notification === "object"
        ? (body.notification as Record<string, unknown>)
        : (body as Record<string, unknown>);

  if (typeof record.id !== "string" || typeof record.recipient_id !== "string") {
    return null;
  }

  return record as unknown as Notification;
}

/** Called by Supabase Database Webhook on notifications INSERT. */
export async function POST(request: Request) {
  if (!webhookAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const notification = extractNotification(body);
  if (!notification) {
    return NextResponse.json({ error: "Missing notification record" }, { status: 400 });
  }

  const result = await sendPushForNotification(notification);
  return NextResponse.json({ ok: true, ...result });
}
